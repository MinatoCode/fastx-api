const axios = require("axios");
const sharp = require("sharp");
const FormData = require("form-data");

const dipto = "https://www.noobs-api.rf.gd/dipto/flux";
const uploadHost = "https://0x0.st";

async function uploadTo0x0(buffer, filename = "file.png") {
  const form = new FormData();
  form.append("file", buffer, { filename });
  form.append("expires", "24"); // ⏱ keep file for 24 hours

  const res = await axios.post(uploadHost, form, {
    headers: {
      ...form.getHeaders(),
    },
    maxBodyLength: Infinity,
  });

  return res.data.trim(); // returns direct URL
}

module.exports = async (req, res) => {
  try {
    const { prompt = "random art", ratio = "512x512" } = req.query;

    // Fetch 4 images in parallel
    const requests = Array.from({ length: 4 }, () =>
      axios.get(
        `${dipto}?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`,
        { responseType: "arraybuffer" }
      )
    );

    const responses = await Promise.all(requests);
    const images = responses.map(r => r.data);

    // Resize each image to 512x512
    const sharpImages = await Promise.all(
      images.map(img => sharp(img).resize(512, 512).png().toBuffer())
    );

    // Upload the 4 images individually (24h expiry)
    const [p1, p2, p3, p4] = await Promise.all([
      uploadTo0x0(sharpImages[0], "p1.png"),
      uploadTo0x0(sharpImages[1], "p2.png"),
      uploadTo0x0(sharpImages[2], "p3.png"),
      uploadTo0x0(sharpImages[3], "p4.png"),
    ]);

    // Create a 1024x1024 collage (2x2 grid)
    const collage = sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    }).composite([
      { input: sharpImages[0], top: 0, left: 0 },
      { input: sharpImages[1], top: 0, left: 512 },
      { input: sharpImages[2], top: 512, left: 0 },
      { input: sharpImages[3], top: 512, left: 512 },
    ]);

    const collageBuffer = await collage.png().toBuffer();

    // Upload collage (24h expiry)
    const main_url = await uploadTo0x0(collageBuffer, "collage.png");

    // Respond with JSON
    res.json({
      success: true,
      author: "minatocodes",
      main_url,
      p1,
      p2,
      p3,
      p4,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

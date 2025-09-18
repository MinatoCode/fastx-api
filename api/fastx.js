// api/fastx.js
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const dipto = "https://www.noobs-api.rf.gd/dipto/flux";

// Upload buffer to Catbox
async function uploadBufferToCatbox(buffer, filename = "file.png") {
  const tmpPath = path.join("/tmp", filename); // safe tmp dir in Vercel
  await fs.promises.writeFile(tmpPath, buffer);

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("userhash", ""); // optional, leave blank
  form.append("fileToUpload", fs.createReadStream(tmpPath));

  const res = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return res.data.trim(); // returns direct file URL
}

module.exports = async (req, res) => {
  try {
    const { prompt = "random art" } = req.query;
    const ratio = "512x512"; // fixed ratio

    // Fetch 4 images
    const requests = Array.from({ length: 4 }, () =>
      axios.get(
        `${dipto}?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`,
        { responseType: "arraybuffer" }
      )
    );
    const responses = await Promise.all(requests);
    const buffers = responses.map(r => Buffer.from(r.data));

    // Upload originals
    const uploadedUrls = await Promise.all(
      buffers.map((buf, i) => uploadBufferToCatbox(buf, `pic${i + 1}.png`))
    );

    // Make grid (2x2 collage)
    const resized = await Promise.all(buffers.map(buf => sharp(buf).resize(512, 512).toBuffer()));
    const gridBuffer = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([
        { input: resized[0], left: 0, top: 0 },
        { input: resized[1], left: 512, top: 0 },
        { input: resized[2], left: 0, top: 512 },
        { input: resized[3], left: 512, top: 512 },
      ])
      .png()
      .toBuffer();

    // Upload grid
    const gridUrl = await uploadBufferToCatbox(gridBuffer, "grid.png");

    // JSON response
    res.json({
      success: true,
      author: "minatocodes",
      main_url: gridUrl,
      p1: uploadedUrls[0],
      p2: uploadedUrls[1],
      p3: uploadedUrls[2],
      p4: uploadedUrls[3],
    });
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

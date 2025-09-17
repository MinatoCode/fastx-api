const axios = require("axios");
const sharp = require("sharp");

const dipto = "https://www.noobs-api.rf.gd/dipto/flux";

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
      images.map(img => sharp(img).resize(512, 512).toBuffer())
    );

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

    const buffer = await collage.png().toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
                           

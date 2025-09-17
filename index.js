const express = require("express");
const axios = require("axios");
const sharp = require("sharp");

const app = express();
const PORT = 3000;

// Base API
const dipto = "https://www.noobs-api.rf.gd/dipto/flux";

app.get("/collage", async (req, res) => {
  try {
    const { prompt = "random art", ratio = "512x512" } = req.query;

    // Fetch 4 images in parallel
    const requests = Array.from({ length: 4 }, () =>
      axios.get(`${dipto}?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`, {
        responseType: "arraybuffer",
      })
    );

    const responses = await Promise.all(requests);
    const images = responses.map(r => r.data);

    // Load images into sharp
    const sharpImages = await Promise.all(images.map(img => sharp(img).resize(512, 512).toBuffer()));

    // Make a 2x2 collage (width = 1024, height = 1024)
    const collage = sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }, // white background
      },
    })
      .composite([
        { input: sharpImages[0], top: 0, left: 0 },
        { input: sharpImages[1], top: 0, left: 512 },
        { input: sharpImages[2], top: 512, left: 0 },
        { input: sharpImages[3], top: 512, left: 512 },
      ])
      .png();

    const buffer = await collage.toBuffer();

    res.set("Content-Type", "image/png");
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
      

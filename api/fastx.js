// api/fastx.js
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const dipto = "https://www.noobs-api.rf.gd/dipto/flux";

// Upload buffer to 0x0.st
async function uploadBufferTo0x0(buffer, filename = "file.png") {
  const tmpPath = path.join("/tmp", filename); // safe temp path in Vercel
  await fs.promises.writeFile(tmpPath, buffer);

  const form = new FormData();
  form.append("file", fs.createReadStream(tmpPath));
  form.append("expires", 24); // 24h

  const res = await axios.post("https://0x0.st", form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return res.data.trim();
}

module.exports = async (req, res) => {
  try {
    const { prompt = "random art" } = req.query;
    const ratio = "512x512"; // 🔥 fixed default ratio

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
      buffers.map((buf, i) => uploadBufferTo0x0(buf, `pic${i + 1}.png`))
    );

    // Make grid
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
    const gridUrl = await uploadBufferTo0x0(gridBuffer, "grid.png");

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
         

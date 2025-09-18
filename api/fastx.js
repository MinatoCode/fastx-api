// fastx.js
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const sharp = require("sharp"); // for grid merge

// Upload single file to 0x0.st
async function uploadTo0x0(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("expires", 24); // 24 hours

  const res = await axios.post("https://0x0.st", form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return res.data.trim(); // returns URL
}

// Create a 2x2 grid with sharp
async function createGrid(pics, outputFile) {
  const imgBuffers = await Promise.all(pics.map(p => sharp(p).resize(300, 300).toBuffer()));

  // Combine 4 images in grid
  const grid = sharp({
    create: {
      width: 600,
      height: 600,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  return grid
    .composite([
      { input: imgBuffers[0], left: 0, top: 0 },
      { input: imgBuffers[1], left: 300, top: 0 },
      { input: imgBuffers[2], left: 0, top: 300 },
      { input: imgBuffers[3], left: 300, top: 300 },
    ])
    .toFile(outputFile);
}

// Main handler
async function handler() {
  try {
    // Replace with your actual image paths
    const images = ["./p1.png", "./p2.png", "./p3.png", "./p4.png"];

    // Upload originals
    const uploaded = await Promise.all(images.map(uploadTo0x0));

    // Create grid and upload
    const gridFile = "./grid.png";
    await createGrid(images, gridFile);
    const gridUrl = await uploadTo0x0(gridFile);

    const response = {
      success: true,
      author: "minatocodes",
      main_url: gridUrl,
      p1: uploaded[0],
      p2: uploaded[1],
      p3: uploaded[2],
      p4: uploaded[3],
    };

    console.log(response);
    return response;
  } catch (err) {
    console.error("Upload failed:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

handler();
      

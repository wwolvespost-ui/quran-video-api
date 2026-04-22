const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());

// ✅ CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.post("/convert", upload.single("video"), async (req, res) => {
  console.log("🔥 request received");

  if (!req.file) {
    console.log("❌ no video uploaded");
    return res.status(400).send("no video");
  }

  const videoPath = req.file.path;
  const output = videoPath + ".mp4";

  console.log("📁 video:", videoPath);

  try {
    // ✅ تحويل مباشر بدون دمج صوت (عشان نتأكد الفيديو شغال)
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i "${videoPath}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -movflags +faststart "${output}"`,
        (err, stdout, stderr) => {
          console.log("ffmpeg log:", stderr);

          if (err) {
            console.log("❌ ffmpeg error:", err);
            reject(err);
          } else {
            console.log("✅ video converted");
            resolve();
          }
        }
      );
    });

    // ✅ رجع الفيديو
    res.download(output, "quran-video.mp4", () => {
      console.log("📥 downloaded");

      // تنظيف
      try {
        fs.unlinkSync(videoPath);
        fs.unlinkSync(output);
      } catch (e) {
        console.log("cleanup error:", e);
      }
    });

  } catch (e) {
    console.log("❌ SERVER ERROR:", e);
    res.status(500).send("error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const cors = require("cors");

const app = express();

// 🔥 حل مشكلة CORS (مهم لموقعك على Netlify)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

// 📁 تخزين الملفات المؤقتة
const upload = multer({ dest: "uploads/" });

// ✅ Route للتأكد إن السيرفر شغال
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// 🎬 تحويل الفيديو
app.post("/convert", upload.single("video"), (req, res) => {

  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const input = req.file.path;
  const output = input + ".mp4";

  // 🔥 ffmpeg تحويل
  exec(`ffmpeg -y -i "${input}" -c:v libx264 -preset ultrafast -c:a aac "${output}"`, (err) => {

    if (err) {
      console.error("FFmpeg error:", err);
      return res.status(500).send("Conversion error");
    }

    // 📥 تحميل الملف
    res.download(output, "quran-video.mp4", (err) => {

      if (err) {
        console.error("Download error:", err);
      }

      // 🧹 حذف الملفات المؤقتة
      try {
        fs.unlinkSync(input);
        fs.unlinkSync(output);
      } catch (e) {
        console.log("Cleanup error:", e);
      }

    });

  });

});

// 🚀 تشغيل السيرفر
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
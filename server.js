const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const cors = require("cors"); // 🔥 مهم

const app = express();

// 🔥 حل مشكلة CORS
app.use(cors());

// تخزين الملفات
const upload = multer({ dest: "uploads/" });

// 👈 route للتأكد إن السيرفر شغال
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// 👇 تحويل الفيديو
app.post("/convert", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const input = req.file.path;
  const output = input + ".mp4";

  exec(`ffmpeg -i "${input}" -c:v libx264 -c:a aac "${output}"`, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Conversion error");
    }

    res.download(output, "quran-video.mp4", () => {
      try {
        fs.unlinkSync(input);
        fs.unlinkSync(output);
      } catch (e) {
        console.log("Cleanup error:", e);
      }
    });
  });
});

// 👈 مهم جدًا لـ Railway
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
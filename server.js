const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

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
    return res.status(400).send("no video");
  }

  const videoPath = req.file.path;
  const output = videoPath + ".mp4";

  const audioUrls = JSON.parse(req.body.audioUrls || "[]");

  try {
    let audioFiles = [];

    // ✅ تحميل الصوت
    for (let i = 0; i < audioUrls.length; i++) {
      const url = audioUrls[i];
      const filePath = path.join("uploads", `audio_${i}.mp3`);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // ⚠️ هنا الحل: نخزن المسار بدون تكرار uploads
      audioFiles.push(filePath);
    }

    // ✅ إنشاء list.txt صح
    const listPath = path.join("uploads", "list.txt");

    const concatList = audioFiles
      .map(f => `file '${path.resolve(f)}'`)
      .join("\n");

    fs.writeFileSync(listPath, concatList);

    const mergedAudio = path.join("uploads", "final_audio.mp3");

    // ✅ دمج الصوت
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -f concat -safe 0 -i "${listPath}" -c:a libmp3lame -q:a 2 "${mergedAudio}"`,
        (err, stdout, stderr) => {
          console.log(stderr);
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // ✅ دمج الصوت مع الفيديو
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i "${videoPath}" -i "${mergedAudio}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest "${output}"`,
        (err, stdout, stderr) => {
          console.log(stderr);
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // ✅ تحميل الفيديو
    res.download(output, "quran-video.mp4", () => {
      console.log("📥 downloaded");

      try {
        fs.unlinkSync(videoPath);
        fs.unlinkSync(output);
        fs.unlinkSync(mergedAudio);
        fs.unlinkSync(listPath);

        audioFiles.forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
      } catch (e) {
        console.log("cleanup error:", e);
      }
    });

  } catch (e) {
    console.log("❌ ERROR:", e);
    res.status(500).send("error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
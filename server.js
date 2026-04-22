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
    const audioUrls = JSON.parse(req.body.audioUrls || "[]");
    console.log("🎧 audioUrls:", audioUrls);

    if (!audioUrls.length) {
      console.log("❌ no audio urls received");
      return res.status(400).send("no audio");
    }

    let audioFiles = [];

    // ✅ تحميل الصوت
    for (let i = 0; i < audioUrls.length; i++) {
      const url = audioUrls[i];
      const path = `uploads/audio_${i}.mp3`;

      console.log("⬇ downloading:", url);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(path);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      audioFiles.push(path);
    }

    // ✅ دمج الصوت
    const listFile = "uploads/list.txt";
    const mergedAudio = "uploads/final_audio.mp3";

    fs.writeFileSync(
      listFile,
      audioFiles.map(f => `file '${f}'`).join("\n")
    );

    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -f concat -safe 0 -i ${listFile} -c:a libmp3lame -q:a 2 ${mergedAudio}`,
        (err, stdout, stderr) => {
          console.log("🎧 merge audio log:", stderr);
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // ✅ دمج الصوت مع الفيديو (ده أهم جزء)
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i "${videoPath}" -i "${mergedAudio}" -map 0:v:0 -map 1:a:0 -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -shortest "${output}"`,
        (err, stdout, stderr) => {
          console.log("🎬 final merge log:", stderr);
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
        fs.unlinkSync(listFile);

        audioFiles.forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
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
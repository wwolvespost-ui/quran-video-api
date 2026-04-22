const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/convert", upload.single("video"), (req, res) => {

const input = req.file.path;
const output = input + ".mp4";

exec(`ffmpeg -i ${input} -c:v libx264 -c:a aac ${output}`, (err) => {
if (err) return res.status(500).send("error");

res.download(output, "quran-video.mp4", () => {
fs.unlinkSync(input);
fs.unlinkSync(output);
});
});

});

app.listen(3000, () => console.log("server running"));
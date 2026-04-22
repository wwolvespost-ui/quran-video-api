const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());

// 🔥 CORS
app.use((req,res,next)=>{
res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Headers","*");
next();
});

app.get("/", (req,res)=>{
res.send("API is running 🚀");
});

app.post("/convert", upload.single("video"), async (req,res)=>{

if(!req.file){
return res.status(400).send("No video uploaded");
}

const videoPath = req.file.path;
const output = videoPath + ".mp4";

const audioUrls = JSON.parse(req.body.audioUrls || "[]");

try{

let mergedAudio = null;

// ================= تحميل ودمج الصوت =================
if(audioUrls.length > 0){

let audioFiles = [];

for(let i=0;i<audioUrls.length;i++){
const url = audioUrls[i];
const path = `uploads/audio_${i}.mp3`;

const response = await axios({
url,
method:"GET",
responseType:"stream"
});

const writer = fs.createWriteStream(path);
response.data.pipe(writer);

await new Promise((resolve,reject)=>{
writer.on("finish",resolve);
writer.on("error",reject);
});

audioFiles.push(path);
}

mergedAudio = "uploads/final_audio.mp3";

let concatList = audioFiles.map(f=>`file '${f}'`).join("\n");
fs.writeFileSync("uploads/list.txt", concatList);

await new Promise((resolve,reject)=>{
exec(`ffmpeg -f concat -safe 0 -i uploads/list.txt -c:a libmp3lame -q:a 2 "${mergedAudio}"`,
(err, stdout, stderr)=>{

console.log("MERGE AUDIO LOG:", stderr);

if(err){
reject(err);
}else resolve();
});
});

}

// ================= دمج الفيديو =================

let ffmpegCmd;

if(mergedAudio){
ffmpegCmd = `ffmpeg -i "${videoPath}" -i "${mergedAudio}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -shortest "${output}"`;
}else{
// 🔥 لو مفيش صوت
ffmpegCmd = `ffmpeg -i "${videoPath}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "${output}"`;
}

await new Promise((resolve,reject)=>{
exec(ffmpegCmd,(err, stdout, stderr)=>{

console.log("FINAL FFMPEG LOG:", stderr);

if(err){
reject(err);
}else resolve();
});
});

// ================= إرسال الفيديو =================

res.download(output,"quran-video.mp4",()=>{

try{
fs.unlinkSync(videoPath);
fs.unlinkSync(output);

if(fs.existsSync("uploads/final_audio.mp3")){
fs.unlinkSync("uploads/final_audio.mp3");
}

if(fs.existsSync("uploads/list.txt")){
fs.unlinkSync("uploads/list.txt");
}

}catch(e){
console.log("cleanup error:",e);
}

});

}catch(e){
console.log("FULL ERROR:", e);
res.status(500).send(e.toString());
}

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running"));
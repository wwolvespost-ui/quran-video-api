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

const videoPath = req.file.path;
const output = videoPath + ".mp4";

const audioUrls = JSON.parse(req.body.audioUrls || "[]");

try{

let audioFiles = [];

// 🔥 تحميل الصوت
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

// 🔥 كتابة قائمة الدمج
let mergedAudio = "uploads/final_audio.mp3";

let concatList = audioFiles.map(f=>`file '${f}'`).join("\n");
fs.writeFileSync("uploads/list.txt", concatList);

// 🔥 مهم جدًا: إعادة ترميز الصوت
await new Promise((resolve,reject)=>{
exec(`ffmpeg -f concat -safe 0 -i uploads/list.txt -c:a libmp3lame -q:a 2 "${mergedAudio}"`,err=>{
if(err){
console.log("merge audio error:",err);
reject(err);
}else resolve();
});
});

// 🔥 دمج الصوت مع الفيديو
await new Promise((resolve,reject)=>{
exec(`ffmpeg -i "${videoPath}" -i "${mergedAudio}" -c:v libx264 -c:a aac -shortest "${output}"`,err=>{
if(err){
console.log("final merge error:",err);
reject(err);
}else resolve();
});
});

// 🔥 تحميل الفيديو
res.download(output,"quran-video.mp4",()=>{

// 🔥 تنظيف الملفات
try{
fs.unlinkSync(videoPath);
fs.unlinkSync(output);
fs.unlinkSync(mergedAudio);
fs.unlinkSync("uploads/list.txt");

audioFiles.forEach(f=>{
if(fs.existsSync(f)) fs.unlinkSync(f);
});

}catch(e){
console.log("cleanup error:",e);
}

});

}catch(e){
console.log(e);
res.status(500).send("error");
}

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running"));
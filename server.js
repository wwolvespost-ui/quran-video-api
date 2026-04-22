const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());

// 🔥 CORS حل المشكلة
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

// 🔥 تحميل كل الصوت ودمجه
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

await new Promise(resolve=>writer.on("finish",resolve));

audioFiles.push(path);
}

// 🔥 دمج كل الصوت
let mergedAudio = "uploads/final_audio.mp3";

let concatList = audioFiles.map(f=>`file '${f}'`).join("\n");
fs.writeFileSync("uploads/list.txt", concatList);

await new Promise((resolve,reject)=>{
exec(`ffmpeg -f concat -safe 0 -i uploads/list.txt -c copy ${mergedAudio}`,err=>{
if(err) reject(err);
else resolve();
});
});

// 🔥 دمج الصوت مع الفيديو
await new Promise((resolve,reject)=>{
exec(`ffmpeg -i ${videoPath} -i ${mergedAudio} -c:v copy -c:a aac -shortest ${output}`,err=>{
if(err) reject(err);
else resolve();
});
});

res.download(output,"quran-video.mp4");

}catch(e){
console.log(e);
res.status(500).send("error");
}

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running"));
FROM node:18

# 🔥 تثبيت ffmpeg (المهم)
RUN apt-get update && apt-get install -y ffmpeg

# فولدر الشغل
WORKDIR /app

# 🔥 الأول ننسخ package عشان الكاش
COPY package*.json ./

# تثبيت dependencies
RUN npm install

# بعد كدا ننسخ باقي المشروع
COPY . .

# فتح البورت
EXPOSE 3000

# تشغيل السيرفر
CMD ["npm", "start"]
FROM node:18-bullseye

# تثبيت كافة المكتبات الأساسية التي يطلبها متصفح كروم في لينكس
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# نسخ الحزم وتثبيتها
COPY package*.json ./
RUN npm install

# نسخ باقي الملفات
COPY . .

# تشغيل السيرفر
CMD ["node", "index.js"]
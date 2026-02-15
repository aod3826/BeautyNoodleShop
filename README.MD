# 🚀 คู่มือการ Deploy Beauty Noodle Shop ไปยัง GitHub Pages

## 📋 สารบัญ
1. [การเตรียมตัว](#การเตรียมตัว)
2. [การตั้งค่า Backend URL](#การตั้งค่า-backend-url)
3. [การ Deploy ไปยัง GitHub Pages](#การ-deploy-ไปยัง-github-pages)
4. [การทดสอบระบบ](#การทดสอบระบบ)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 การเตรียมตัว

### สิ่งที่ต้องมี:
- ✅ บัญชี GitHub (สมัครฟรีที่ https://github.com)
- ✅ Google Apps Script Web App URL ที่ได้จากการ Deploy Backend
- ✅ ไฟล์ `index.html` จากโปรเจคนี้

---

## ⚙️ การตั้งค่า Backend URL

### ขั้นตอนที่ 1: เปิดไฟล์ index.html
เปิดไฟล์ `index.html` ด้วย Text Editor (เช่น VS Code, Notepad++, Sublime Text)

### ขั้นตอนที่ 2: แก้ไข SCRIPT_URL
ค้นหาบรรทัดนี้ (อยู่ประมาณบรรทัดที่ 400+):

```javascript
const SCRIPT_URL = 'YOUR_GAS_WEB_APP_URL';
```

แทนที่ `YOUR_GAS_WEB_APP_URL` ด้วย URL ที่คุณได้จาก Google Apps Script:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxx.../exec';
```

### ⚠️ ตัวอย่าง URL ที่ถูกต้อง:
```
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
```

**หมายเหตุ:** URL จะต้องลงท้ายด้วย `/exec`

### ขั้นตอนที่ 3: บันทึกไฟล์
กด `Ctrl + S` (หรือ `Cmd + S` บน Mac) เพื่อบันทึกการแก้ไข

---

## 🌐 การ Deploy ไปยัง GitHub Pages

### วิธีที่ 1: ใช้ GitHub Web Interface (แนะนำสำหรับมือใหม่)

#### 1. สร้าง Repository ใหม่
1. เข้าไปที่ https://github.com และ Login
2. คลิก **+** มุมบนขวา → **New repository**
3. ตั้งชื่อ Repository เช่น `beauty-noodle-shop`
4. เลือก **Public**
5. ✅ เช็ค **Add a README file**
6. คลิก **Create repository**

#### 2. อัพโหลดไฟล์ index.html
1. ใน Repository ที่สร้างใหม่ คลิก **Add file** → **Upload files**
2. ลากไฟล์ `index.html` มาวาง หรือคลิก **choose your files**
3. เลือกไฟล์ `index.html` ที่แก้ไข URL แล้ว
4. พิมพ์ commit message: `Initial commit`
5. คลิก **Commit changes**

#### 3. เปิดใช้งาน GitHub Pages
1. ไปที่ **Settings** (แท็บบนสุด)
2. เลื่อนลงหา **Pages** ในเมนูด้านซ้าย
3. ส่วน **Source** เลือก:
   - Branch: `main` (หรือ `master`)
   - Folder: `/ (root)`
4. คลิก **Save**
5. รอสักครู่ จะมีข้อความแสดง URL ของเว็บไซต์:
   ```
   Your site is published at https://USERNAME.github.io/beauty-noodle-shop/
   ```

#### 4. เข้าถึงเว็บไซต์
คลิกที่ URL ที่แสดงขึ้นมา หรือไปที่:
```
https://YOUR_GITHUB_USERNAME.github.io/REPOSITORY_NAME/
```

ตัวอย่าง:
```
https://john-doe.github.io/beauty-noodle-shop/
```

---

### วิธีที่ 2: ใช้ Git Command Line (สำหรับผู้มีประสบการณ์)

```bash
# 1. สร้าง repository ใหม่บน GitHub ก่อน

# 2. Clone repository
git clone https://github.com/YOUR_USERNAME/beauty-noodle-shop.git
cd beauty-noodle-shop

# 3. คัดลอกไฟล์ index.html เข้าไปในโฟลเดอร์
cp /path/to/index.html .

# 4. Commit และ Push
git add index.html
git commit -m "Initial commit: Add Beauty Noodle Shop SPA"
git push origin main

# 5. เปิดใช้งาน GitHub Pages ผ่าน Web Interface (ตามขั้นตอนด้านบน)
```

---

## 🧪 การทดสอบระบบ

### 1. ทดสอบในเครื่อง (Local Testing)
ก่อน Deploy สามารถทดสอบโดยการเปิดไฟล์ `index.html` ด้วย Browser โดยตรง:

1. คลิกขวาที่ไฟล์ `index.html`
2. เลือก **Open with** → เลือก Browser (Chrome, Firefox, Edge)
3. ทดสอบการทำงาน:
   - ✅ เมนูแสดงขึ้นหรือไม่?
   - ✅ เพิ่มสินค้าลงตะกร้าได้หรือไม่?
   - ✅ สามารถสั่งซื้อและได้เลขออเดอร์กลับมาหรือไม่?

### 2. ทดสอบบน GitHub Pages
หลัง Deploy แล้ว:

1. เปิด URL ที่ได้จาก GitHub Pages
2. เปิด Developer Console (กด F12)
3. ตรวจสอบ Console แท็บ เพื่อดู Error (ถ้ามี)
4. ทดสอบบนมือถือ:
   - เปิด URL ด้วยมือถือ
   - ทดสอบ Touch interactions
   - ตรวจสอบ Responsive design

### 3. ตรวจสอบ API Connection
หากเมนูไม่แสดง ให้ตรวจสอบ:

```javascript
// เปิด Console (F12) แล้วพิมพ์:
console.log(SCRIPT_URL);

// ควรแสดง URL ที่ถูกต้อง เช่น:
// "https://script.google.com/macros/s/AKfycbxxx.../exec"
```

---

## 🐛 Troubleshooting

### ปัญหา 1: หน้าเว็บว่างเปล่า / ไม่มีเมนู

**สาเหตุที่เป็นไปได้:**
- ❌ SCRIPT_URL ยังไม่ได้แก้ไข หรือแก้ไขผิด
- ❌ Backend (Google Apps Script) ยังไม่ได้ Deploy
- ❌ CORS Policy ของ Browser

**วิธีแก้:**

1. เปิด Browser Console (F12) → ดูที่ Console tab
2. หาข้อความ Error สีแดง
3. ถ้าเจอ Error แบบนี้:
   ```
   Failed to fetch
   TypeError: Failed to fetch
   ```
   แสดงว่า SCRIPT_URL ผิด หรือ Backend ไม่ได้ Deploy

4. ถ้าเจอ CORS Error:
   ```
   Access to fetch at '...' from origin '...' has been blocked by CORS policy
   ```
   แสดงว่า Google Apps Script ยังไม่ได้ตั้งค่าให้ Access แบบ Public

**แก้ไข CORS:**
- ไปที่ Google Apps Script
- Deploy → New deployment
- ตั้งค่า **Who has access** = **Anyone**

---

### ปัญหา 2: สั่งซื้อแล้วไม่ได้เลขออเดอร์

**สาเหตุ:**
- Backend Function `saveOrder` มีปัญหา
- Payload ที่ส่งไปไม่ถูกต้อง

**วิธีแก้:**

1. เปิด Console (F12)
2. ไปที่แท็บ **Network**
3. คลิกที่ request ที่ส่งไป
4. ดู Response เพื่อดู Error message

5. ทดสอบ Backend โดยตรงใน Apps Script:
   ```javascript
   function testSaveOrder() {
     const testData = {
       action: 'saveOrder',
       userId: 'TestUser',
       items: [
         { menuId: 'M001', quantity: 1, selectedOptions: [] }
       ],
       type: 'dine-in',
       payment: 'cash'
     };
     
     const result = saveOrderAPI(testData);
     Logger.log(result.getContent());
   }
   ```

---

### ปัญหา 3: GitHub Pages ไม่อัพเดท

**สาเหตุ:**
- Browser Cache
- GitHub Pages ยังไม่ build เสร็จ

**วิธีแก้:**

1. **Clear Browser Cache:**
   - กด `Ctrl + Shift + R` (Windows/Linux)
   - กด `Cmd + Shift + R` (Mac)

2. **Hard Refresh:**
   - กด `Ctrl + F5` (Windows)
   - กด `Cmd + Shift + Delete` (Mac) → Clear cache

3. **รอสักครู่:**
   - GitHub Pages ใช้เวลา 1-5 นาทีในการ build

4. **ตรวจสอบ Build Status:**
   - ไปที่ **Actions** tab ใน Repository
   - ดู workflow status

---

### ปัญหา 4: มือถือแสดงผลไม่เรียบร้อย

**วิธีแก้:**

1. ตรวจสอบ meta viewport tag (ควรมีอยู่แล้วในโค้ด):
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. ทดสอบบน Chrome DevTools:
   - กด F12
   - คลิกไอคอนมือถือ (Toggle device toolbar)
   - เลือก Device ต่างๆ เพื่อทดสอบ

---

## 📱 การเปิดใช้งานบนมือถือ

### เพิ่มเป็น Home Screen (Mobile)

**iOS (iPhone/iPad):**
1. เปิดเว็บด้วย Safari
2. กดปุ่ม Share (สี่เหลี่ยมมีลูกศร)
3. เลื่อนลงหา **Add to Home Screen**
4. ตั้งชื่อ: "Beauty Noodle Shop"
5. กด **Add**

**Android:**
1. เปิดเว็บด้วย Chrome
2. กดปุ่ม Menu (จุด 3 จุด)
3. เลือก **Add to Home screen**
4. ตั้งชื่อ: "Beauty Noodle Shop"
5. กด **Add**

---

## 🎨 การปรับแต่ง (Optional)

### เปลี่ยนชื่อร้าน
แก้ไขใน HTML:
```html
<h1 class="text-3xl font-display font-bold">🍜 Beauty Noodle</h1>
```

### เปลี่ยนสี Theme
แก้ไขใน CSS (ตัวแปร Tailwind):
```javascript
// ค้นหา:
from-amber-600 to-orange-600

// แทนที่ด้วยสีที่ต้องการ เช่น:
from-blue-600 to-indigo-600
```

### เพิ่ม Favicon
1. สร้างไฟล์ `favicon.ico` (16x16 หรือ 32x32 pixels)
2. อัพโหลดไปยัง GitHub Repository
3. เพิ่มในส่วน `<head>`:
   ```html
   <link rel="icon" type="image/x-icon" href="favicon.ico">
   ```

---

## 📊 การติดตาม Analytics (Optional)

### เพิ่ม Google Analytics

1. สร้าง Property ใน Google Analytics
2. คัดลอก Tracking Code
3. เพิ่มก่อน `</head>`:
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

---

## 🔒 Security Best Practices

### 1. ใช้ HTTPS
- GitHub Pages รองรับ HTTPS โดยอัตโนมัติ
- ตรวจสอบว่า URL เป็น `https://` (ไม่ใช่ `http://`)

### 2. ซ่อน Sensitive Data
- **อย่า** Hard-code ข้อมูลสำคัญใน Frontend
- **อย่า** เก็บข้อมูลลูกค้าใน localStorage
- Backend ควรตรวจสอบ Authorization

### 3. Rate Limiting
พิจารณาเพิ่ม Rate Limiting ใน Backend เพื่อป้องกัน Abuse

---

## 🎉 สำเร็จแล้ว!

คุณได้ Deploy เว็บไซต์ Beauty Noodle Shop ไปยัง GitHub Pages เรียบร้อยแล้ว! 🎊

### URL ของคุณคือ:
```
https://YOUR_USERNAME.github.io/REPOSITORY_NAME/
```

### สามารถแชร์ URL นี้ให้ลูกค้าได้เลย! 🚀

---

## 💡 Tips เพิ่มเติม

1. **Custom Domain:**
   - สามารถใช้ Domain ของตัวเอง (เช่น www.beautynoodle.com)
   - ไปที่ Settings → Pages → Custom domain

2. **Performance:**
   - ใช้ CDN สำหรับ images
   - Minify CSS/JS (ถ้าต้องการ)

3. **SEO:**
   - เพิ่ม meta tags สำหรับ Social Media
   - เพิ่ม robots.txt และ sitemap.xml

4. **Backup:**
   - GitHub จะเป็น backup อัตโนมัติ
   - สามารถดูประวัติการแก้ไขได้ที่ Commits

---

**พัฒนาโดย:** Senior Frontend Developer Team  
**วันที่:** February 16, 2026  
**เวอร์ชัน:** 1.0.0

สนับสนุน: หากมีปัญหาหรือคำถาม สามารถเปิด Issue ใน GitHub Repository ได้เลยครับ! 😊

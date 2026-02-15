# Beauty Noodle Shop - Backend Documentation

## 📋 สารบัญ
1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [การติดตั้ง](#การติดตั้ง)
3. [โครงสร้างฐานข้อมูล](#โครงสร้างฐานข้อมูล)
4. [API Endpoints](#api-endpoints)
5. [การใช้งาน](#การใช้งาน)
6. [Security Best Practices](#security-best-practices)

---

## 🎯 ภาพรวมระบบ

ระบบ Backend สำหรับร้านก่วยเตี๋ยว "Beauty Noodle Shop" ที่พัฒนาด้วย Google Apps Script และ Google Sheets เป็นฐานข้อมูล

### คุณสมบัติหลัก
- ✅ การจัดการเมนูอาหาร
- ✅ ระบบรับออเดอร์พร้อมคำนวณราคาอัตโนมัติ
- ✅ ติดตามสถานะออเดอร์แบบ Real-time
- ✅ ป้องกันการเขียนข้อมูลทับกันด้วย LockService
- ✅ บันทึก Log การทำงานทั้งหมด
- ✅ API แบบ RESTful (GET/POST)

---

## 🚀 การติดตั้ง

### ขั้นตอนที่ 1: สร้าง Google Spreadsheet
1. เปิด [Google Sheets](https://sheets.google.com)
2. สร้าง Spreadsheet ใหม่ และตั้งชื่อว่า "Beauty Noodle Shop"

### ขั้นตอนที่ 2: เปิด Apps Script Editor
1. ใน Google Sheets ไปที่ **Extensions > Apps Script**
2. ลบโค้ดเริ่มต้นทั้งหมด
3. วางโค้ดจากไฟล์ `Code.gs` ทั้งหมด
4. บันทึก (กด Ctrl+S หรือ Cmd+S)

### ขั้นตอนที่ 3: รันฟังก์ชันตั้งค่าเริ่มต้น
1. ในเมนู Apps Script เลือกฟังก์ชัน `initialSetup`
2. กดปุ่ม Run (▶️)
3. อนุญาตการเข้าถึง (Authorization) ครั้งแรก
4. รอจนกว่าจะเสร็จสิ้น

### ขั้นตอนที่ 4: สร้างฐานข้อมูล
1. เลือกฟังก์ชัน `setupDatabase`
2. กดปุ่ม Run (▶️)
3. ระบบจะสร้างชีต 4 ชีต:
   - **Config** - การตั้งค่าร้านค้า
   - **Menu** - รายการเมนู
   - **Orders** - ออเดอร์ทั้งหมด
   - **Logs** - บันทึกการทำงาน

### ขั้นตอนที่ 5: Deploy เป็น Web App
1. ไปที่ **Deploy > New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. กด **Deploy**
5. คัดลอก **Web app URL** (ใช้เป็น API endpoint)

---

## 📊 โครงสร้างฐานข้อมูล

### ชีต: Config
เก็บการตั้งค่าร้านค้า

| key | value |
|-----|-------|
| shopName | Beauty Noodle Shop |
| isOpen | true |
| liffId | (ว่างเปล่า) |
| taxRate | 0.07 |
| serviceCharge | 0 |
| currency | THB |

### ชีต: Menu
เก็บรายการเมนูอาหาร

| id | name | category | price | options_json | status |
|----|------|----------|-------|--------------|--------|
| M001 | ก่วยเตี๋ยวหมูน้ำใส | ก่วยเตี๋ยว | 45 | [JSON] | active |
| M002 | ก่วยเตี๋ยวหมูน้ำตก | ก่วยเตี๋ยว | 50 | [JSON] | active |

**options_json format:**
```json
[
  {
    "type": "noodle",
    "name": "เส้น",
    "choices": ["เส้นเล็ก", "เส้นใหญ่", "เส้นหมี่", "วุ้นเส้น"]
  },
  {
    "type": "addon",
    "name": "เพิ่มเติม",
    "choices": ["เนื้อพิเศษ +20", "ไข่ต้ม +10"]
  }
]
```

### ชีต: Orders
เก็บออเดอร์ทั้งหมด

| orderId | userId | items_json | totalPrice | type | payment | status | timestamp |
|---------|--------|------------|------------|------|---------|--------|-----------|
| ORD1708... | U123... | [JSON] | 120 | dine-in | cash | completed | 2024-02-15... |

**items_json format:**
```json
[
  {
    "menuId": "M001",
    "quantity": 2,
    "selectedOptions": ["เส้นเล็ก", "เนื้อพิเศษ +20"]
  },
  {
    "menuId": "M004",
    "quantity": 1,
    "selectedOptions": []
  }
]
```

**Order Status:**
- `pending` - รอยืนยัน
- `confirmed` - ยืนยันแล้ว
- `preparing` - กำลังทำ
- `ready` - พร้อมเสิร์ฟ
- `completed` - เสร็จสิ้น
- `cancelled` - ยกเลิก

### ชีต: Logs
บันทึกการทำงานทั้งหมด

| timestamp | userId | action | details |
|-----------|--------|--------|---------|
| 2024-02-15 10:30:00 | U123... | CREATE_ORDER | Order ORD... created |

---

## 🔌 API Endpoints

### Base URL
```
https://script.google.com/macros/s/{YOUR_DEPLOYMENT_ID}/exec
```

---

## GET APIs

### 1. ดึงรายการเมนู
**Endpoint:** `GET /?action=getMenu`

**Response:**
```json
{
  "success": true,
  "message": "Menu retrieved successfully",
  "data": {
    "menu": [
      {
        "id": "M001",
        "name": "ก่วยเตี๋ยวหมูน้ำใส",
        "category": "ก่วยเตี๋ยว",
        "price": 45,
        "options": [...],
        "status": "active"
      }
    ]
  },
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

**ตัวอย่างการเรียกใช้:**
```javascript
fetch('YOUR_WEB_APP_URL?action=getMenu')
  .then(res => res.json())
  .then(data => console.log(data));
```

---

### 2. ตรวจสอบสถานะร้านค้า
**Endpoint:** `GET /?action=getShopStatus`

**Response:**
```json
{
  "success": true,
  "message": "Shop status retrieved",
  "data": {
    "shopName": "Beauty Noodle Shop",
    "isOpen": true,
    "liffId": "",
    "currency": "THB"
  },
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

---

### 3. ดึงข้อมูลออเดอร์
**Endpoint:** `GET /?action=getOrder&orderId={ORDER_ID}`

**Response:**
```json
{
  "success": true,
  "message": "Order found",
  "data": {
    "order": {
      "orderId": "ORD1708012345678900",
      "userId": "U1234567890",
      "items": [...],
      "totalPrice": 120,
      "type": "dine-in",
      "payment": "cash",
      "status": "pending",
      "timestamp": "2024-02-15T10:30:00.000Z"
    }
  },
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

---

## POST APIs

### 1. สร้างออเดอร์ใหม่
**Endpoint:** `POST /`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "saveOrder",
  "userId": "U1234567890",
  "items": [
    {
      "menuId": "M001",
      "quantity": 2,
      "selectedOptions": ["เส้นเล็ก", "เนื้อพิเศษ +20"]
    },
    {
      "menuId": "M004",
      "quantity": 1,
      "selectedOptions": []
    }
  ],
  "type": "dine-in",
  "payment": "cash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order saved successfully",
  "data": {
    "orderId": "ORD1708012345678900",
    "totalPrice": 120,
    "status": "pending"
  },
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

**ตัวอย่างการเรียกใช้:**
```javascript
const orderData = {
  action: 'saveOrder',
  userId: 'U1234567890',
  items: [
    { menuId: 'M001', quantity: 2, selectedOptions: ['เส้นเล็ก', 'เนื้อพิเศษ +20'] },
    { menuId: 'M004', quantity: 1, selectedOptions: [] }
  ],
  type: 'dine-in',
  payment: 'cash'
};

fetch('YOUR_WEB_APP_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

### 2. อัพเดทสถานะออเดอร์
**Endpoint:** `POST /`

**Request Body:**
```json
{
  "action": "updateStatus",
  "orderId": "ORD1708012345678900",
  "status": "completed",
  "userId": "ADMIN"
}
```

**Valid Status:**
- pending
- confirmed
- preparing
- ready
- completed
- cancelled

**Response:**
```json
{
  "success": true,
  "message": "Order status updated",
  "data": {
    "orderId": "ORD1708012345678900",
    "newStatus": "completed"
  },
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

---

### 3. อัพเดทการตั้งค่า (Admin only)
**Endpoint:** `POST /`

**Request Body:**
```json
{
  "action": "updateConfig",
  "key": "isOpen",
  "value": "false",
  "adminToken": "YOUR_ADMIN_SECRET"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Config updated",
  "data": {
    "key": "isOpen",
    "value": "false"
  },
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

---

## 💻 การใช้งาน

### Example 1: แสดงรายการเมนูในหน้าเว็บ
```javascript
// Fetch menu และแสดงผล
async function loadMenu() {
  const response = await fetch('YOUR_WEB_APP_URL?action=getMenu');
  const result = await response.json();
  
  if (result.success) {
    const menu = result.data.menu;
    
    menu.forEach(item => {
      console.log(`${item.name} - ${item.price} บาท`);
    });
  }
}

loadMenu();
```

### Example 2: สร้างออเดอร์จาก LINE LIFF
```javascript
// สมมติว่าได้ userId จาก LINE LIFF
async function createOrder(userId, cart) {
  const orderPayload = {
    action: 'saveOrder',
    userId: userId,
    items: cart.map(item => ({
      menuId: item.id,
      quantity: item.quantity,
      selectedOptions: item.options
    })),
    type: 'dine-in',
    payment: 'cash'
  };
  
  const response = await fetch('YOUR_WEB_APP_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert(`สั่งซื้อสำเร็จ! หมายเลขออเดอร์: ${result.data.orderId}`);
    alert(`ยอดชำระ: ${result.data.totalPrice} บาท`);
  }
}
```

### Example 3: อัพเดทสถานะออเดอร์ (ฝั่ง Admin)
```javascript
async function updateOrderStatus(orderId, newStatus) {
  const payload = {
    action: 'updateStatus',
    orderId: orderId,
    status: newStatus,
    userId: 'ADMIN'
  };
  
  const response = await fetch('YOUR_WEB_APP_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`อัพเดทสถานะเป็น ${newStatus} สำเร็จ`);
  }
}

// เรียกใช้
updateOrderStatus('ORD1708012345678900', 'ready');
```

---

## 🔐 Security Best Practices

### 1. การเก็บข้อมูลลับ
```javascript
// ✅ ถูกต้อง - ใช้ Script Properties
PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);

// ❌ ผิด - Hard-code
const SPREADSHEET_ID = '1234567890abcdef'; // อย่าทำแบบนี้!
```

### 2. การใช้ LockService
```javascript
const lock = LockService.getScriptLock();
try {
  lock.waitLock(30000); // รอ lock สูงสุด 30 วินาที
  // ทำงานที่ต้องการ
} finally {
  lock.releaseLock(); // ปลดล็อคเสมอ
}
```

### 3. Admin Token (แนะนำเพิ่ม)
```javascript
// เพิ่ม admin token ใน Script Properties
PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', 'your-secret-token');

// ตรวจสอบใน updateConfigAPI
function updateConfigAPI(payload) {
  const storedToken = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  
  if (payload.adminToken !== storedToken) {
    return createResponse(false, 'Unauthorized', null, 401);
  }
  
  // ดำเนินการต่อ...
}
```

### 4. Rate Limiting (แนะนำเพิ่ม)
```javascript
// ตรวจสอบจำนวนครั้งที่เรียก API ต่อ user
function checkRateLimit(userId) {
  const cache = CacheService.getScriptCache();
  const key = `rate_${userId}`;
  const count = cache.get(key) || 0;
  
  if (count > 100) { // จำกัด 100 requests ต่อชั่วโมง
    return false;
  }
  
  cache.put(key, parseInt(count) + 1, 3600); // เก็บ 1 ชั่วโมง
  return true;
}
```

---

## 🧪 การทดสอบระบบ

### ใช้ฟังก์ชัน testSystem()
```javascript
// ใน Apps Script Editor
// เลือกฟังก์ชัน testSystem และกด Run

function testSystem() {
  // ทดสอบทั้งหมด:
  // 1. Setup database
  // 2. Get menu
  // 3. Save order
  // 4. Update status
}
```

### ตรวจสอบ Logs
ดู execution logs ใน Apps Script:
1. ไปที่ **Executions** (ไอคอนนาฬิกา)
2. คลิกที่ execution ที่ต้องการดู
3. ดู log output

---

## 📈 การขยายระบบ

### เพิ่มฟีเจอร์ Reporting
```javascript
function getOrderReport(startDate, endDate) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  
  let totalRevenue = 0;
  let orderCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const orderDate = new Date(data[i][7]); // timestamp column
    
    if (orderDate >= startDate && orderDate <= endDate) {
      totalRevenue += data[i][3]; // totalPrice column
      orderCount++;
    }
  }
  
  return {
    totalRevenue: totalRevenue,
    orderCount: orderCount,
    averageOrderValue: totalRevenue / orderCount
  };
}
```

### เพิ่ม Webhook สำหรับ LINE Notify
```javascript
function notifyLineWhenOrderReceived(orderId, totalPrice) {
  const lineToken = PropertiesService.getScriptProperties().getProperty('LINE_NOTIFY_TOKEN');
  
  const message = `🔔 ออเดอร์ใหม่!\nหมายเลข: ${orderId}\nยอดชำระ: ${totalPrice} บาท`;
  
  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + lineToken
    },
    payload: {
      'message': message
    }
  });
}

// เรียกใช้หลังจาก save order สำเร็จ
```

---

## 🐛 Troubleshooting

### ปัญหา: "Spreadsheet ID not found"
**วิธีแก้:**
1. รันฟังก์ชัน `initialSetup()` ก่อน
2. ตรวจสอบว่า Script Properties มี SPREADSHEET_ID หรือไม่

### ปัญหา: "Authorization required"
**วิธีแก้:**
1. รันฟังก์ชันใดก็ได้ใน Apps Script Editor
2. คลิก "Review Permissions"
3. เลือกบัญชี Google
4. คลิก "Allow"

### ปัญหา: API ตอบช้า
**วิธีแก้:**
1. ตรวจสอบจำนวนแถวใน Sheet (ควรน้อยกว่า 10,000 แถว)
2. ใช้ `getDataRange()` แทน `getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn())`
3. พิจารณาใช้ Cache สำหรับข้อมูลที่ไม่เปลี่ยนบ่อย

---

## 📞 ติดต่อ & สนับสนุน

หากมีปัญหาหรือต้องการเพิ่มฟีเจอร์ ติดต่อได้ที่:
- Email: support@beautynoodleshop.com
- LINE Official: @beautynoodle

---

## 📄 License

MIT License - ใช้งานได้อย่างอิสระ

---

**พัฒนาโดย:** Senior Backend Developer Team  
**เวอร์ชัน:** 1.0.0  
**อัพเดทล่าสุด:** February 15, 2024

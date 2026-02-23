/**
 * Beauty Noodle Shop - Backend System (Full Version)
 * Google Apps Script Backend for Restaurant Management
 * 
 * @author Senior Backend Developer
 * @version 2.0.0
 */

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

/**
 * ฟังก์ชันตั้งค่าเริ่มต้น - ให้รันครั้งแรกเพื่อบันทึก Spreadsheet ID
 */
function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ss.getId();
  
  // เก็บ Spreadsheet ID ใน Script Properties
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
  
  Logger.log('✅ Initial setup completed. Spreadsheet ID saved.');
  Logger.log('Spreadsheet ID: ' + spreadsheetId);
}

/**
 * ตั้งค่า LINE Messaging API
 */
function setupLineMessaging() {
  const properties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  
  const token = ui.prompt('🔑 กรุณาใส่ LINE Channel Access Token:').getResponseText();
  const groupId = ui.prompt('👥 กรุณาใส่ LINE Group ID:').getResponseText();
  
  properties.setProperty('LINE_ACCESS_TOKEN', token);
  properties.setProperty('LINE_GROUP_ID', groupId);
  
  Logger.log('✅ LINE Messaging setup completed.');
}

/**
 * ดึงค่า LINE Configuration
 */
function getLineConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    accessToken: properties.getProperty('LINE_ACCESS_TOKEN'),
    groupId: properties.getProperty('LINE_GROUP_ID')
  };
}

/**
 * ดึง Spreadsheet จาก Properties
 */
function getSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID not found. Please run initialSetup() first.');
  }
  
  return SpreadsheetApp.openById(spreadsheetId);
}

// ============================================================================
// DATABASE SETUP
// ============================================================================

/**
 * สร้างโครงสร้างฐานข้อมูลทั้งหมด
 */
function setupDatabase() {
  try {
    const ss = getSpreadsheet();
    
    createConfigSheet(ss);
    createMenuSheet(ss);
    createOrdersSheet(ss);
    createLogsSheet(ss);
    
    Logger.log('✅ Database setup completed successfully!');
    return {
      success: true,
      message: 'Database initialized successfully'
    };
    
  } catch (error) {
    Logger.log('❌ Error in setupDatabase: ' + error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * สร้างชีต Config
 */
function createConfigSheet(ss) {
  let sheet = ss.getSheetByName('Config');
  
  if (!sheet) {
    sheet = ss.insertSheet('Config');
  } else {
    sheet.clear();
  }
  
  // Headers
  sheet.getRange('A1:B1').setValues([['key', 'value']]);
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  
  // ข้อมูลเริ่มต้น
  const configData = [
    ['shopName', 'Beauty Noodle Shop'],
    ['isOpen', 'true'],
    ['liffId', ''],
    ['taxRate', '0.07'],
    ['serviceCharge', '0'],
    ['currency', 'THB'],
    ['phoneNumber', '081-234-5678'],
    ['openTime', '08:00'],
    ['closeTime', '20:00']
  ];
  
  sheet.getRange(2, 1, configData.length, 2).setValues(configData);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
  
  Logger.log('✓ Config sheet created');
}

/**
 * สร้างชีต Menu พร้อมคอลัมน์รูปภาพ
 */
function createMenuSheet(ss) {
  let sheet = ss.getSheetByName('Menu');
  
  if (!sheet) {
    sheet = ss.insertSheet('Menu');
  } else {
    sheet.clear();
  }
  
  // Headers พร้อมคอลัมน์ image_url
  const headers = [['id', 'name', 'category', 'price', 'options_json', 'status', 'image_url', 'description']];
  sheet.getRange('A1:H1').setValues(headers);
  sheet.getRange('A1:H1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  
  // ข้อมูลตัวอย่างพร้อมรูปภาพ (ใช้ Unsplash สำหรับตัวอย่าง)
  const sampleData = [
    ['M001', 'ก๋วยเตี๋ยวหมูน้ำใส', 'ก๋วยเตี๋ยว', 45, JSON.stringify([
      {type: 'noodle', name: 'เลือกเส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น', 'บะหมี่']},
      {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ลูกชิ้น +10', 'หมูกรอบ +15', 'ไข่ต้ม +10']},
      {type: 'spice', name: 'ระดับความเผ็ด', choices: ['ไม่เผ็ด', 'เผ็ดน้อย', 'เผ็ดกลาง', 'เผ็ดมาก']}
    ]), 'active', 'https://images.unsplash.com/photo-1559310541-2b2f7c3d3b3d?w=400&h=300&fit=crop', 'น้ำซุปใส หอมกลิ่นเครื่องเทศ'],
    
    ['M002', 'ก๋วยเตี๋ยวต้มยำหมู', 'ก๋วยเตี๋ยว', 55, JSON.stringify([
      {type: 'noodle', name: 'เลือกเส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น', 'บะหมี่']},
      {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ลูกชิ้น +10', 'หมูกรอบ +15', 'ไข่ต้ม +10']},
      {type: 'spice', name: 'ระดับความเผ็ด', choices: ['ไม่เผ็ด', 'เผ็ดน้อย', 'เผ็ดกลาง', 'เผ็ดมาก']}
    ]), 'active', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop', 'ต้มยำน้ำข้น รสจัดจ้าน'],
    
    ['M003', 'ก๋วยเตี๋ยวแห้งหมู', 'ก๋วยเตี๋ยว', 50, JSON.stringify([
      {type: 'noodle', name: 'เลือกเส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'บะหมี่']},
      {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ลูกชิ้น +10', 'หมูกรอบ +15', 'ไข่ต้ม +10']}
    ]), 'active', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop', 'เส้นแห้ง คลุกเคล้าซอสสูตรพิเศษ'],
    
    ['M004', 'ข้าวหมูแดง', 'ข้าว', 50, JSON.stringify([
      {type: 'addon', name: 'เพิ่มเติม', choices: ['ไข่ดาว +15', 'หมูกรอบ +20', 'น้ำซุป +10']}
    ]), 'active', 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop', 'ข้าวหมูแดงหมูกรอบ น้ำราดสูตรเด็ด'],
    
    ['M005', 'ข้าวขาหมู', 'ข้าว', 60, JSON.stringify([
      {type: 'addon', name: 'เพิ่มเติม', choices: ['ไข่ต้ม +10', 'น้ำซุป +10', 'ข้าวเพิ่ม +10']}
    ]), 'active', 'https://images.unsplash.com/photo-1627301879583-34d668aeed80?w=400&h=300&fit=crop', 'ขาหมูพะโล้ นุ่มละลาย'],
    
    ['M006', 'เกี๊ยวซ่า', 'ของทานเล่น', 40, JSON.stringify([
      {type: 'sauce', name: 'น้ำจิ้ม', choices: ['น้ำจิ้มซีฟู้ด', 'โชยุ', 'พริกน้ำส้ม']}
    ]), 'active', 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=400&h=300&fit=crop', 'เกี๊ยวซ่าไส้หมู-ผัก ทอดกรอบ'],
    
    ['M007', 'น้ำเปล่า', 'เครื่องดื่ม', 10, '[]', 'active', 'https://images.unsplash.com/photo-1560023907-5f3390ea83ad?w=400&h=300&fit=crop', 'น้ำดื่มบริสุทธิ์'],
    
    ['M008', 'น้ำอัดลม', 'เครื่องดื่ม', 15, JSON.stringify([
      {type: 'brand', name: 'ยี่ห้อ', choices: ['โค้ก', 'เป๊ปซี่', 'แฟนต้า', 'สไปรท์']}
    ]), 'active', 'https://images.unsplash.com/photo-1629203851122-3726ecb4c0f7?w=400&h=300&fit=crop', 'เครื่องดื่มเย็นๆ'],
    
    ['M009', 'ชาเย็น', 'เครื่องดื่ม', 25, JSON.stringify([
      {type: 'sugar', name: 'ระดับหวาน', choices: ['หวานน้อย', 'หวานปกติ', 'หวานพิเศษ']},
      {type: 'milk', name: 'ชนิดนม', choices: ['นมข้นหวาน', 'นมสด']}
    ]), 'active', 'https://images.unsplash.com/photo-1579639782596-4f04b6ae42fd?w=400&h=300&fit=crop', 'ชาไทยสูตรดั้งเดิม'],
    
    ['M010', 'ของหวานรวมมิตร', 'ของหวาน', 35, JSON.stringify([
      {type: 'topping', name: 'เลือกเครื่อง', choices: ['เฉาก๊วย', 'ลอดช่อง', 'เผือก', 'มัน', 'ลูกตาล']}
    ]), 'active', 'https://images.unsplash.com/photo-1593229047097-4cf22f4f513a?w=400&h=300&fit=crop', 'รวมมิตรน้ำกะทิสด']
  ];
  
  sheet.getRange(2, 1, sampleData.length, 8).setValues(sampleData);
  sheet.setFrozenRows(1);
  
  // ตั้งค่าความกว้างคอลัมน์
  sheet.setColumnWidth(1, 80);  // id
  sheet.setColumnWidth(2, 200); // name
  sheet.setColumnWidth(3, 100); // category
  sheet.setColumnWidth(4, 60);  // price
  sheet.setColumnWidth(5, 300); // options_json
  sheet.setColumnWidth(6, 70);  // status
  sheet.setColumnWidth(7, 250); // image_url
  sheet.setColumnWidth(8, 250); // description
  
  Logger.log('✓ Menu sheet created with image column');
}

/**
 * สร้างชีต Orders พร้อมคอลัมน์ครบถ้วน
 */
function createOrdersSheet(ss) {
  let sheet = ss.getSheetByName('Orders');
  
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
  } else {
    sheet.clear();
  }
  
  // Headers พร้อมคอลัมน์เพิ่มเติม
  const headers = [['orderId', 'userId', 'items_json', 'totalPrice', 'type', 'payment', 'status', 'timestamp', 'note', 'last_updated']];
  sheet.getRange('A1:J1').setValues(headers);
  sheet.getRange('A1:J1').setFontWeight('bold').setBackground('#fbbc04').setFontColor('#000000');
  
  // ตั้งค่าความกว้างคอลัมน์
  sheet.setColumnWidth(1, 150); // orderId
  sheet.setColumnWidth(2, 100); // userId
  sheet.setColumnWidth(3, 300); // items_json
  sheet.setColumnWidth(4, 80);  // totalPrice
  sheet.setColumnWidth(5, 80);  // type
  sheet.setColumnWidth(6, 80);  // payment
  sheet.setColumnWidth(7, 80);  // status
  sheet.setColumnWidth(8, 150); // timestamp
  sheet.setColumnWidth(9, 200); // note
  sheet.setColumnWidth(10, 150); // last_updated
  
  sheet.setFrozenRows(1);
  
  Logger.log('✓ Orders sheet created with enhanced columns');
}

/**
 * สร้างชีต Logs
 */
function createLogsSheet(ss) {
  let sheet = ss.getSheetByName('Logs');
  
  if (!sheet) {
    sheet = ss.insertSheet('Logs');
  } else {
    sheet.clear();
  }
  
  // Headers
  const headers = [['timestamp', 'userId', 'action', 'details', 'ip_address']];
  sheet.getRange('A1:E1').setValues(headers);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 5);
  
  Logger.log('✓ Logs sheet created');
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET API - ดึงข้อมูลเมนูและสถานะร้านค้า
 */
function doGet(e) {
  // 1. ถ้าไม่มีการส่ง parameter 'action' มา ให้แสดงหน้าเว็บ HTML
  if (!e || !e.parameter || !e.parameter.action) {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Beauty Noodle Shop')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 2. ถ้ามีการส่ง action มา (API calls)
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getMenu':
        return getMenuAPI();
      case 'getShopStatus':
        return getShopStatusAPI();
      case 'getOrder':
        const orderId = e.parameter.orderId;
        return getOrderAPI(orderId);
      case 'getUserOrders':
        const userId = e.parameter.userId;
        return getUserOrdersAPI(userId);
      default:
        return createResponse(false, 'Invalid action', null, 400);
    }
  } catch (error) {
    logAction('GET_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Server error: ' + error.message, null, 500);
  }
}

/**
 * POST API - รับ JSON Payload และ LINE Webhook
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const payload = JSON.parse(e.postData.contents);
    
    // ตรวจสอบว่าเป็น LINE Webhook หรือไม่
    if (payload.events && Array.isArray(payload.events)) {
      return handleLineWebhook(payload);
    }
    
    const action = payload.action;
    
    switch (action) {
      case 'saveOrder':
        return createResponseFromResult(saveOrder(payload));
      
      case 'updateStatus':
        const result = updateOrderStatus(payload.orderId, payload.status, payload.userId || 'API');
        return createResponse(result, result ? 'Status updated' : 'Update failed', { orderId: payload.orderId, status: payload.status });
      
      case 'updateConfig':
        return createResponseFromResult(updateConfig(payload.key, payload.value));
      
      case 'updateMenuImage':
        return createResponseFromResult(updateMenuImage(payload.menuId, payload.imageUrl));
      
      default:
        return createResponse(false, 'Invalid action', null, 400);
    }
    
  } catch (error) {
    logAction('POST_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Server error: ' + error.message, null, 500);
    
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// API FUNCTIONS - GET
// ============================================================================

/**
 * ดึงข้อมูลเมนูทั้งหมด (เวอร์ชันปรับปรุงพร้อมรูปภาพ)
 */
function getMenuAPI() {
  try {
    const menu = getMenuItemsWithDetails();
    
    logAction('GET_MENU', `Returned ${menu.length} items`, 'SYSTEM');
    
    return createResponse(true, 'Menu retrieved successfully', { 
      menu: menu,
      total: menu.length,
      categories: [...new Set(menu.map(item => item.category))]
    });
    
  } catch (error) {
    logAction('GET_MENU_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Error retrieving menu: ' + error.message, null, 500);
  }
}

/**
 * ดึงสถานะร้านค้า
 */
function getShopStatusAPI() {
  try {
    const config = getConfig();
    const isOpenByConfig = parseConfigBoolean(config.isOpen);

    const shopStatus = {
      shopName: config.shopName || 'Beauty Noodle Shop',
      isOpen: isOpenByConfig,
      isOpenByConfig: isOpenByConfig,
      liffId: config.liffId || '',
      currency: config.currency || 'THB',
      phoneNumber: config.phoneNumber || '081-234-5678',
      openTime: config.openTime || '08:00',
      closeTime: config.closeTime || '20:00'
    };
    
    logAction('GET_SHOP_STATUS', 'Status retrieved', 'SYSTEM');
    
    return createResponse(true, 'Shop status retrieved', shopStatus);
    
  } catch (error) {
    logAction('GET_SHOP_STATUS_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Error retrieving shop status: ' + error.message, null, 500);
  }
}

/**
 * ดึงข้อมูลออเดอร์เฉพาะ
 */
function getOrderAPI(orderId) {
  try {
    if (!orderId) {
      return createResponse(false, 'Order ID is required', null, 400);
    }
    
    const order = getOrderById(orderId);
    
    if (order) {
      return createResponse(true, 'Order found', { order: order });
    } else {
      return createResponse(false, 'Order not found', null, 404);
    }
    
  } catch (error) {
    logAction('GET_ORDER_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Error retrieving order: ' + error.message, null, 500);
  }
}

/**
 * ดึงออเดอร์ของผู้ใช้
 */
function getUserOrdersAPI(userId) {
  try {
    if (!userId) {
      return createResponse(false, 'User ID is required', null, 400);
    }
    
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    const data = sheet.getDataRange().getValues();
    
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId) { // userId อยู่คอลัมน์ B
        orders.push({
          orderId: data[i][0],
          totalPrice: Number(data[i][3]),
          type: data[i][4],
          payment: data[i][5],
          status: data[i][6],
          timestamp: data[i][7],
          note: data[i][8]
        });
      }
    }
    
    return createResponse(true, 'Orders retrieved', { orders: orders });
    
  } catch (error) {
    logAction('GET_USER_ORDERS_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Error: ' + error.message, null, 500);
  }
}

// ============================================================================
// CORE BUSINESS LOGIC
// ============================================================================

/**
 * บันทึกออเดอร์ลงใน Sheet 'Orders' พร้อมคำนวณราคา
 * @param {Object} orderData - ข้อมูลออเดอร์ { userId, items, type, payment, note }
 * @returns {Object} - ผลการบันทึก { success, orderId, totalPrice, error? }
 */
function saveOrder(orderData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Orders กรุณาสร้างก่อน');
    }
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!orderData.userId || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('ข้อมูลออเดอร์ไม่ถูกต้อง');
    }
    
    // ดึงข้อมูลเมนูล่าสุดเพื่อคำนวณราคา
    const menuItems = getMenuItemsWithDetails();
    
    // คำนวณราคาทั้งหมด
    let totalPrice = 0;
    const processedItems = orderData.items.map(item => {
      const menuItem = menuItems.find(m => m.id === item.menuId);
      
      if (!menuItem) {
        throw new Error(`ไม่พบเมนู ID: ${item.menuId}`);
      }
      
      // คำนวณราคาต่อชิ้นรวม options
      let itemPrice = menuItem.price;
      let optionsPrice = 0;
      const optionsWithPrice = (item.selectedOptions || []).map(opt => {
        // หาราคาเพิ่มจาก options (เช่น "เนื้อพิเศษ +20")
        const match = opt.match(/\+(\d+)/);
        if (match) {
          optionsPrice += parseInt(match[1]);
        }
        return opt;
      });
      
      itemPrice += optionsPrice;
      const totalItemPrice = itemPrice * (item.quantity || 1);
      totalPrice += totalItemPrice;
      
      return {
        menuId: item.menuId,
        menuName: menuItem.name,
        quantity: item.quantity || 1,
        basePrice: menuItem.price,
        options: optionsWithPrice,
        optionsPrice: optionsPrice,
        itemPrice: itemPrice,
        totalPrice: totalItemPrice
      };
    });
    
    // สร้าง Order ID
    const orderId = generateOrderId();
    const timestamp = new Date();
    
    // เตรียมข้อมูลสำหรับบันทึก
    const rowData = [
      orderId,                          // A: orderId
      orderData.userId || 'Guest',      // B: userId
      JSON.stringify(processedItems),   // C: items_json
      totalPrice,                       // D: totalPrice
      orderData.type || 'dine-in',      // E: type
      orderData.payment || 'cash',       // F: payment
      'Pending',                         // G: status
      timestamp,                         // H: timestamp
      orderData.note || '',               // I: note
      timestamp                           // J: last_updated
    ];
    
    // บันทึกข้อมูล
    sheet.appendRow(rowData);
    
    // บันทึก Log
    logAction('SAVE_ORDER', `Order ${orderId} created - Total: ${totalPrice}฿ - User: ${orderData.userId}`, orderData.userId);
    
    // ส่ง LINE Notification (ไม่ blocking)
    try {
      const lineConfig = getLineConfig();
      if (lineConfig.accessToken && lineConfig.groupId) {
        sendLineFlex({
          orderId: orderId,
          items: processedItems,
          totalPrice: totalPrice,
          type: orderData.type,
          payment: orderData.payment,
          note: orderData.note
        });
      }
    } catch (lineError) {
      logAction('LINE_ERROR', `LINE notification failed: ${lineError.message}`, 'SYSTEM');
    }
    
    return {
      success: true,
      orderId: orderId,
      totalPrice: totalPrice,
      timestamp: timestamp
    };
    
  } catch (error) {
    logAction('SAVE_ORDER_ERROR', error.message, orderData?.userId || 'SYSTEM');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * อัปเดตสถานะออเดอร์
 * @param {string} orderId - รหัสออเดอร์
 * @param {string} status - สถานะใหม่
 * @param {string} userId - ผู้ทำการอัปเดต
 * @returns {boolean} - สำเร็จหรือไม่
 */
function updateOrderStatus(orderId, status, userId = 'SYSTEM') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Orders');
    }
    
    // ตรวจสอบสถานะที่ถูกต้อง
    const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`สถานะไม่ถูกต้อง: ${status}`);
    }
    
    // ค้นหาออเดอร์
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    let oldStatus = '';
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        foundRow = i + 1;
        oldStatus = data[i][6];
        break;
      }
    }
    
    if (foundRow === -1) {
      throw new Error(`ไม่พบออเดอร์: ${orderId}`);
    }
    
    // อัปเดตสถานะ (คอลัมน์ G)
    sheet.getRange(foundRow, 7).setValue(status);
    
    // อัปเดต last_updated (คอลัมน์ J)
    sheet.getRange(foundRow, 10).setValue(new Date());
    
    // บันทึก Log
    logAction('UPDATE_STATUS', `Order ${orderId}: ${oldStatus} -> ${status} by ${userId}`, userId);
    
    return true;
    
  } catch (error) {
    logAction('UPDATE_STATUS_ERROR', error.message, userId);
    return false;
  }
}

/**
 * บันทึก Log การทำงาน
 * @param {string} action - การกระทำ
 * @param {string} details - รายละเอียด
 * @param {string} userId - ผู้ใช้
 */
function logAction(action, details, userId = 'SYSTEM') {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('Logs');
    
    if (!sheet) {
      sheet = ss.insertSheet('Logs');
      sheet.getRange('A1:E1').setValues([['timestamp', 'userId', 'action', 'details', 'ip_address']]);
      sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
    }
    
    // หา IP address (ถ้ามี)
    let ipAddress = '';
    try {
      const request = JSON.parse(PropertiesService.getScriptProperties().getProperty('LAST_REQUEST') || '{}');
      ipAddress = request.parameter?.__ow_headers?.['x-forwarded-for'] || '';
    } catch (e) {}
    
    sheet.appendRow([
      new Date(),
      userId,
      action,
      details,
      ipAddress
    ]);
    
  } catch (error) {
    console.error('Failed to log action:', error.message);
  }
}

// ============================================================================
// MENU FUNCTIONS
// ============================================================================

/**
 * ดึงข้อมูลเมนูแบบละเอียด (รวมรูปภาพ)
 * @returns {Array} - รายการเมนูพร้อมรูปภาพ
 */
function getMenuItemsWithDetails() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // หา index ของคอลัมน์ต่างๆ
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const categoryIndex = headers.indexOf('category');
    const priceIndex = headers.indexOf('price');
    const optionsIndex = headers.indexOf('options_json');
    const statusIndex = headers.indexOf('status');
    const imageIndex = headers.indexOf('image_url');
    const descIndex = headers.indexOf('description');
    
    const menu = [];
    
    for (const row of rows) {
      if (!row[idIndex]) continue;
      
      if (statusIndex !== -1 && row[statusIndex] !== 'active') continue;
      
      let options = [];
      if (optionsIndex !== -1 && row[optionsIndex]) {
        try {
          options = JSON.parse(row[optionsIndex]);
        } catch (e) {
          options = [];
        }
      }
      
      menu.push({
        id: row[idIndex],
        name: row[nameIndex] || 'ไม่ระบุชื่อ',
        category: row[categoryIndex] || 'ทั่วไป',
        price: parseFloat(row[priceIndex]) || 0,
        options: options,
        status: statusIndex !== -1 ? row[statusIndex] : 'active',
        imageUrl: imageIndex !== -1 ? row[imageIndex] : null,
        description: descIndex !== -1 ? row[descIndex] : '',
        hasImage: imageIndex !== -1 && row[imageIndex] ? true : false
      });
    }
    
    return menu;
    
  } catch (error) {
    logAction('GET_MENU_ERROR', error.message, 'SYSTEM');
    return [];
  }
}

/**
 * อัปเดตรูปภาพเมนู
 */
function updateMenuImage(menuId, imageUrl) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Menu');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let imageIndex = headers.indexOf('image_url');
    
    if (imageIndex === -1) {
      sheet.getRange(1, headers.length + 1).setValue('image_url');
      sheet.getRange(1, headers.length + 1).setFontWeight('bold');
      imageIndex = headers.length;
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === menuId) {
        sheet.getRange(i + 1, imageIndex + 1).setValue(imageUrl);
        logAction('UPDATE_MENU_IMAGE', `Menu ${menuId} image updated`, 'ADMIN');
        return { success: true, menuId: menuId };
      }
    }
    
    return { success: false, error: 'Menu not found' };
    
  } catch (error) {
    logAction('UPDATE_MENU_IMAGE_ERROR', error.message, 'ADMIN');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CONFIG FUNCTIONS
// ============================================================================

/**
 * ดึงค่า Config ทั้งหมด
 */
function getConfig() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');
    
    if (!sheet) {
      return {};
    }
    
    const data = sheet.getDataRange().getValues();
    
    const config = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        config[data[i][0]] = data[i][1];
      }
    }
    
    return config;
    
  } catch (error) {
    logAction('GET_CONFIG_ERROR', error.message, 'SYSTEM');
    return {};
  }
}

/**
 * อัปเดทค่า Config
 */
function updateConfig(key, value) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Config');
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        logAction('UPDATE_CONFIG', `${key} = ${value}`, 'ADMIN');
        return { success: true, key: key, value: value };
      }
    }
    
    // ถ้าไม่เจอ key ให้เพิ่มใหม่
    sheet.appendRow([key, value]);
    logAction('UPDATE_CONFIG', `New config: ${key} = ${value}`, 'ADMIN');
    return { success: true, key: key, value: value };
    
  } catch (error) {
    logAction('UPDATE_CONFIG_ERROR', error.message, 'ADMIN');
    return { success: false, error: error.message };
  }
}

/**
 * แปลงค่า config ให้เป็น boolean
 */
function parseConfigBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return String(value).trim().toLowerCase() === 'true';
}

// ============================================================================
// ORDER HELPER FUNCTIONS
// ============================================================================

/**
 * สร้าง Order ID แบบ unique
 */
function generateOrderId() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BN${year}${month}${day}-${random}`;
}

/**
 * ดึงข้อมูลออเดอร์จาก Order ID
 */
function getOrderById(orderId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        return {
          orderId: data[i][0],
          userId: data[i][1],
          items: JSON.parse(data[i][2] || '[]'),
          totalPrice: Number(data[i][3]),
          type: data[i][4],
          payment: data[i][5],
          status: data[i][6],
          timestamp: data[i][7],
          note: data[i][8],
          lastUpdated: data[i][9]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    logAction('GET_ORDER_BY_ID_ERROR', error.message, 'SYSTEM');
    return null;
  }
}

// ============================================================================
// LINE MESSAGING INTEGRATION
// ============================================================================

/**
 * ส่ง Flex Message ไปยังกลุ่ม LINE
 */
function sendLineFlex(orderData) {
  try {
    const lineConfig = getLineConfig();
    
    if (!lineConfig.accessToken || !lineConfig.groupId) {
      Logger.log('⚠️ LINE configuration not found');
      return false;
    }
    
    const flexMessage = createOrderFlexMessage(orderData);
    
    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      to: lineConfig.groupId,
      messages: [flexMessage]
    };
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.accessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ LINE notification sent successfully');
      return true;
    } else {
      Logger.log('❌ LINE API Error: ' + response.getContentText());
      return false;
    }
    
  } catch (error) {
    Logger.log('❌ Error sending LINE message: ' + error.message);
    return false;
  }
}

/**
 * สร้าง Flex Message สำหรับแสดงออเดอร์
 */
function createOrderFlexMessage(orderData) {
  // สร้างรายการอาหาร
  const itemsContent = orderData.items.map(item => {
    let optionsText = '';
    if (item.options && item.options.length > 0) {
      optionsText = '\n(' + item.options.map(opt => opt.replace(/\s*\+\d+/, '')).join(', ') + ')';
    }
    
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${item.quantity}x`,
          size: 'sm',
          color: '#555555',
          flex: 0,
          margin: 'none'
        },
        {
          type: 'text',
          text: item.menuName + optionsText,
          size: 'sm',
          color: '#111111',
          wrap: true,
          flex: 5,
          margin: 'md'
        },
        {
          type: 'text',
          text: `${item.totalPrice} ฿`,
          size: 'sm',
          color: '#D97706',
          weight: 'bold',
          align: 'end',
          flex: 2
        }
      ],
      margin: 'md'
    };
  });
  
  const typeIcon = orderData.type === 'dine-in' ? '🍽️' : '📦';
  const typeText = orderData.type === 'dine-in' ? 'ทานที่ร้าน' : 'ซื้อกลับ';
  
  const paymentIcon = orderData.payment === 'cash' ? '💵' : orderData.payment === 'qr-code' ? '📱' : '🏦';
  const paymentText = orderData.payment === 'cash' ? 'เงินสด' : orderData.payment === 'qr-code' ? 'QR Code' : 'โอนเงิน';
  
  const flexMessage = {
    type: 'flex',
    altText: `ออเดอร์ใหม่ #${orderData.orderId}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🍜 ออเดอร์ใหม่!',
            color: '#ffffff',
            size: 'xl',
            weight: 'bold'
          },
          {
            type: 'text',
            text: `#${orderData.orderId}`,
            color: '#ffffff',
            size: 'sm',
            margin: 'xs'
          }
        ],
        backgroundColor: '#F59E0B',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'ประเภท:',
                size: 'sm',
                color: '#555555',
                flex: 0
              },
              {
                type: 'text',
                text: `${typeIcon} ${typeText}`,
                size: 'sm',
                color: '#111111',
                weight: 'bold',
                flex: 5,
                margin: 'md'
              }
            ],
            margin: 'none'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'ชำระเงิน:',
                size: 'sm',
                color: '#555555',
                flex: 0
              },
              {
                type: 'text',
                text: `${paymentIcon} ${paymentText}`,
                size: 'sm',
                color: '#111111',
                flex: 5,
                margin: 'md'
              }
            ],
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'รายการอาหาร:',
                size: 'sm',
                color: '#555555',
                weight: 'bold',
                margin: 'md'
              },
              ...itemsContent
            ]
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'ยอดรวม',
                size: 'md',
                color: '#555555',
                weight: 'bold'
              },
              {
                type: 'text',
                text: `${orderData.totalPrice} ฿`,
                size: 'xl',
                color: '#D97706',
                weight: 'bold',
                align: 'end'
              }
            ],
            margin: 'lg'
          }
        ],
        spacing: 'md',
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '✅ รับออเดอร์',
              data: `action=accept_order&orderId=${orderData.orderId}`,
              displayText: 'รับออเดอร์แล้ว'
            },
            style: 'primary',
            color: '#10B981',
            height: 'sm'
          }
        ],
        spacing: 'sm',
        paddingAll: '20px'
      }
    }
  };
  
  return flexMessage;
}

/**
 * จัดการ LINE Webhook Events
 */
function handleLineWebhook(webhookData) {
  try {
    const events = webhookData.events || [];
    
    events.forEach(event => {
      if (event.type === 'postback') {
        handlePostbackEvent(event);
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    logAction('LINE_WEBHOOK_ERROR', error.message, 'SYSTEM');
    return ContentService.createTextOutput(JSON.stringify({ status: 'error' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * จัดการ Postback Event จากปุ่ม LINE
 */
function handlePostbackEvent(event) {
  try {
    const data = event.postback.data;
    const replyToken = event.replyToken;
    
    const params = {};
    data.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[key] = value;
    });
    
    if (params.action === 'accept_order') {
      const orderId = params.orderId;
      const currentOrder = getOrderById(orderId);
      
      if (!currentOrder) {
        replyLineMessage(replyToken, 'ไม่พบออเดอร์นี้ในระบบ');
        return;
      }
      
      if (currentOrder.status !== 'Pending') {
        replyLineMessage(replyToken, `⚠️ ออเดอร์นี้ถูกรับไปแล้ว (สถานะ: ${currentOrder.status})`);
        return;
      }
      
      const updated = updateOrderStatus(orderId, 'Confirmed', 'LINE_USER');
      
      if (updated) {
        replyLineMessage(replyToken, `✅ รับออเดอร์ #${orderId} เรียบร้อยแล้ว!\n\nกำลังเริ่มทำอาหาร... 🍳`);
      } else {
        replyLineMessage(replyToken, '❌ เกิดข้อผิดพลาดในการอัพเดทสถานะ');
      }
    }
    
  } catch (error) {
    logAction('POSTBACK_ERROR', error.message, 'LINE_USER');
  }
}

/**
 * ส่งข้อความตอบกลับผ่าน LINE Reply API
 */
function replyLineMessage(replyToken, messageText) {
  try {
    const lineConfig = getLineConfig();
    
    if (!lineConfig.accessToken) {
      Logger.log('LINE access token not found');
      return;
    }
    
    const url = 'https://api.line.me/v2/bot/message/reply';
    const payload = {
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: messageText
        }
      ]
    };
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.accessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    UrlFetchApp.fetch(url, options);
    
  } catch (error) {
    logAction('LINE_REPLY_ERROR', error.message, 'SYSTEM');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * สร้าง JSON Response
 */
function createResponse(success, message, data, statusCode = 200) {
  const response = {
    success: success,
    message: message,
    data: data || null,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * สร้าง Response จาก Result Object
 */
function createResponseFromResult(result) {
  if (result.success) {
    return createResponse(true, 'Success', result);
  } else {
    return createResponse(false, result.error || 'Failed', null, 400);
  }
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * ฟังก์ชันทดสอบระบบทั้งหมด
 */
function testSystem() {
  Logger.log('='.repeat(50));
  Logger.log('🔍 Testing Beauty Noodle Shop System');
  Logger.log('='.repeat(50));
  
  // 1. ทดสอบสร้างฐานข้อมูล
  Logger.log('\n📁 1. Testing database setup...');
  const setupResult = setupDatabase();
  Logger.log(setupResult);
  
  // 2. ทดสอบดึงเมนู
  Logger.log('\n🍜 2. Testing getMenuAPI...');
  const menuResult = getMenuAPI();
  const menuData = JSON.parse(menuResult.getContent());
  Logger.log(`Found ${menuData.data?.total || 0} menu items`);
  
  // 3. ทดสอบบันทึกออเดอร์
  Logger.log('\n📝 3. Testing saveOrder...');
  const testOrder = {
    userId: 'TEST_USER_' + Date.now(),
    items: [
      { 
        menuId: 'M001', 
        quantity: 2, 
        selectedOptions: ['เส้นเล็ก', 'เนื้อพิเศษ +20'] 
      },
      { 
        menuId: 'M007', 
        quantity: 1, 
        selectedOptions: [] 
      }
    ],
    type: 'dine-in',
    payment: 'cash',
    note: 'ไม่ใส่ผักชี'
  };
  
  const saveResult = saveOrder(testOrder);
  Logger.log('Save Order Result:', saveResult);
  
  // 4. ทดสอบอัปเดตสถานะ
  if (saveResult.success) {
    Logger.log('\n🔄 4. Testing updateOrderStatus...');
    const updateResult = updateOrderStatus(saveResult.orderId, 'Confirmed', 'TESTER');
    Logger.log('Update to Confirmed:', updateResult);
    
    const updateResult2 = updateOrderStatus(saveResult.orderId, 'Preparing', 'TESTER');
    Logger.log('Update to Preparing:', updateResult2);
  }
  
  // 5. ทดสอบ Log
  Logger.log('\n📋 5. Testing logAction...');
  logAction('TEST_COMPLETE', 'System test completed', 'TESTER');
  
  Logger.log('\n' + '='.repeat(50));
  Logger.log('✅ Test Completed!');
  Logger.log('='.repeat(50));
}

/**
 * ฟังก์ชันรีเซ็ตระบบ (ลบข้อมูลทั้งหมด)
 */
function resetSystem() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '⚠️ รีเซ็ตระบบ',
    'คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      const ss = getSpreadsheet();
      
      // ลบชีตทั้งหมด
      ['Config', 'Menu', 'Orders', 'Logs'].forEach(sheetName => {
        const sheet = ss.getSheetByName(sheetName);
        if (sheet) {
          ss.deleteSheet(sheet);
        }
      });
      
      // สร้างใหม่
      setupDatabase();
      
      Logger.log('✅ System reset completed');
      ui.alert('✅ รีเซ็ตระบบสำเร็จ');
      
    } catch (error) {
      Logger.log('❌ Reset failed:', error);
      ui.alert('❌ รีเซ็ตระบบล้มเหลว: ' + error.message);
    }
  }
}  
// ============================================================================
// ADMIN DASHBOARD FUNCTIONS
// ============================================================================

/**
 * GET API - เพิ่ม endpoint สำหรับ admin
 */
function doGet(e) {
  // ถ้าไม่มีการส่ง parameter 'action' มา ให้แสดงหน้าเว็บ HTML
  if (!e || !e.parameter || !e.parameter.action) {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Beauty Noodle Shop')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getMenu':
        return getMenuAPI();
      case 'getShopStatus':
        return getShopStatusAPI();
      case 'getOrder':
        const orderId = e.parameter.orderId;
        return getOrderAPI(orderId);
      case 'getUserOrders':
        const userId = e.parameter.userId;
        return getUserOrdersAPI(userId);
      
      // Admin endpoints
      case 'admin':
        // ถ้าต้องการหน้า admin HTML
        return HtmlService.createTemplateFromFile('admin')
          .evaluate()
          .setTitle('Beauty Noodle - Admin Dashboard')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
      case 'getAllOrders':
        return getAllOrdersAPI(e.parameter);
      
      case 'getDashboardStats':
        return getDashboardStatsAPI();
      
      case 'getBestSellingItems':
        return getBestSellingItemsAPI();
      
      case 'getInventoryStatus':
        return getInventoryStatusAPI();
      
      default:
        return createResponse(false, 'Invalid action', null, 400);
    }
  } catch (error) {
    logAction('GET_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Server error: ' + error.message, null, 500);
  }
}

/**
 * POST API - เพิ่ม admin endpoints
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const payload = JSON.parse(e.postData.contents);
    
    // ตรวจสอบว่าเป็น LINE Webhook หรือไม่
    if (payload.events && Array.isArray(payload.events)) {
      return handleLineWebhook(payload);
    }
    
    const action = payload.action;
    
    switch (action) {
      case 'saveOrder':
        return createResponseFromResult(saveOrder(payload));
      
      case 'updateStatus':
        const result = updateOrderStatus(payload.orderId, payload.status, payload.userId || 'API');
        return createResponse(result, result ? 'Status updated' : 'Update failed', { orderId: payload.orderId, status: payload.status });
      
      case 'updateConfig':
        return createResponseFromResult(updateConfig(payload.key, payload.value));
      
      case 'updateMenuImage':
        return createResponseFromResult(updateMenuImage(payload.menuId, payload.imageUrl));
      
      // Admin endpoints
      case 'adminUpdateOrderStatus':
        return createResponseFromResult(adminUpdateOrderStatus(payload.orderId, payload.status, payload.adminId));
      
      case 'adminDeleteOrder':
        return createResponseFromResult(adminDeleteOrder(payload.orderId, payload.adminId));
      
      case 'adminUpdateInventory':
        return createResponseFromResult(adminUpdateInventory(payload.itemId, payload.quantity, payload.adminId));
      
      case 'adminAddInventoryItem':
        return createResponseFromResult(adminAddInventoryItem(payload.itemData, payload.adminId));
      
      default:
        return createResponse(false, 'Invalid action', null, 400);
    }
    
  } catch (error) {
    logAction('POST_ERROR', error.message, 'SYSTEM');
    return createResponse(false, 'Server error: ' + error.message, null, 500);
    
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// ADMIN ORDER FUNCTIONS
// ============================================================================

/**
 * ดึงออเดอร์ทั้งหมดสำหรับ Admin
 */
function getAllOrdersAPI(params) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      return createResponse(false, 'Orders sheet not found', null, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // กรองตาม status ถ้ามี
    const filterStatus = params.status;
    
    const orders = rows.map(row => {
      return {
        orderId: row[0],
        userId: row[1],
        items: JSON.parse(row[2] || '[]'),
        totalPrice: Number(row[3]),
        type: row[4],
        payment: row[5],
        status: row[6],
        timestamp: row[7],
        note: row[8] || '',
        lastUpdated: row[9] || row[7]
      };
    }).filter(order => {
      if (filterStatus && filterStatus !== 'all') {
        return order.status === filterStatus;
      }
      return true;
    }).sort((a, b) => {
      // เรียงจากล่าสุดขึ้นก่อน
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    logAction('ADMIN_GET_ORDERS', `Retrieved ${orders.length} orders`, 'ADMIN');
    
    return createResponse(true, 'Orders retrieved successfully', { 
      orders: orders,
      total: orders.length
    });
    
  } catch (error) {
    logAction('ADMIN_GET_ORDERS_ERROR', error.message, 'ADMIN');
    return createResponse(false, 'Error: ' + error.message, null, 500);
  }
}

/**
 * Admin อัปเดตสถานะออเดอร์
 */
function adminUpdateOrderStatus(orderId, newStatus, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Orders');
    }
    
    const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`สถานะไม่ถูกต้อง: ${newStatus}`);
    }
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    let oldStatus = '';
    let orderData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        foundRow = i + 1;
        oldStatus = data[i][6];
        orderData = {
          orderId: data[i][0],
          userId: data[i][1],
          items: JSON.parse(data[i][2] || '[]'),
          totalPrice: Number(data[i][3]),
          type: data[i][4],
          payment: data[i][5],
          status: data[i][6],
          timestamp: data[i][7],
          note: data[i][8]
        };
        break;
      }
    }
    
    if (foundRow === -1) {
      throw new Error(`ไม่พบออเดอร์: ${orderId}`);
    }
    
    // อัปเดตสถานะ
    sheet.getRange(foundRow, 7).setValue(newStatus);
    sheet.getRange(foundRow, 10).setValue(new Date()); // last_updated
    
    // บันทึก Log
    logAction('ADMIN_UPDATE_STATUS', `Order ${orderId}: ${oldStatus} -> ${newStatus} by ${adminId}`, adminId);
    
    // ถ้าสถานะเป็น Completed ให้อัปเดตสต็อก
    if (newStatus === 'Completed' && orderData) {
      updateInventoryFromOrder(orderData);
    }
    
    return {
      success: true,
      orderId: orderId,
      oldStatus: oldStatus,
      newStatus: newStatus
    };
    
  } catch (error) {
    logAction('ADMIN_UPDATE_STATUS_ERROR', error.message, adminId);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Admin ลบออเดอร์
 */
function adminDeleteOrder(orderId, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Orders');
    }
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        foundRow = i + 1;
        break;
      }
    }
    
    if (foundRow === -1) {
      throw new Error(`ไม่พบออเดอร์: ${orderId}`);
    }
    
    // ลบแถว
    sheet.deleteRow(foundRow);
    
    // บันทึก Log
    logAction('ADMIN_DELETE_ORDER', `Order ${orderId} deleted by ${adminId}`, adminId);
    
    return {
      success: true,
      orderId: orderId
    };
    
  } catch (error) {
    logAction('ADMIN_DELETE_ORDER_ERROR', error.message, adminId);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// DASHBOARD STATS FUNCTIONS
// ============================================================================

/**
 * ดึงสถิติสำหรับ Dashboard
 */
function getDashboardStatsAPI() {
  try {
    const ss = getSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');
    
    if (!ordersSheet) {
      return createResponse(false, 'Orders sheet not found', null, 404);
    }
    
    const data = ordersSheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    let stats = {
      totalOrders: 0,
      totalRevenue: 0,
      todayOrders: 0,
      todayRevenue: 0,
      weekOrders: 0,
      weekRevenue: 0,
      pendingOrders: 0,
      preparingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      averageOrderValue: 0,
      ordersByType: {
        'dine-in': 0,
        'takeaway': 0,
        'delivery': 0
      },
      ordersByPayment: {
        'cash': 0,
        'qr-code': 0,
        'transfer': 0
      }
    };
    
    rows.forEach(row => {
      const orderDate = new Date(row[7]);
      const status = row[6] || 'Pending';
      const type = row[4] || 'dine-in';
      const payment = row[5] || 'cash';
      const totalPrice = Number(row[3]) || 0;
      
      stats.totalOrders++;
      stats.totalRevenue += totalPrice;
      
      // นับตามสถานะ
      if (status === 'Pending') stats.pendingOrders++;
      else if (status === 'Preparing' || status === 'Confirmed') stats.preparingOrders++;
      else if (status === 'Completed') stats.completedOrders++;
      else if (status === 'Cancelled') stats.cancelledOrders++;
      
      // นับตามประเภท
      if (stats.ordersByType[type] !== undefined) {
        stats.ordersByType[type]++;
      }
      
      // นับตามชำระเงิน
      if (stats.ordersByType[payment] !== undefined) {
        stats.ordersByPayment[payment]++;
      }
      
      // ออเดอร์วันนี้
      if (orderDate >= today) {
        stats.todayOrders++;
        stats.todayRevenue += totalPrice;
      }
      
      // ออเดอร์ 7 วันล่าสุด
      if (orderDate >= weekAgo) {
        stats.weekOrders++;
        stats.weekRevenue += totalPrice;
      }
    });
    
    stats.averageOrderValue = stats.totalOrders > 0 
      ? Math.round(stats.totalRevenue / stats.totalOrders) 
      : 0;
    
    logAction('ADMIN_GET_STATS', 'Dashboard stats retrieved', 'ADMIN');
    
    return createResponse(true, 'Stats retrieved', stats);
    
  } catch (error) {
    logAction('ADMIN_GET_STATS_ERROR', error.message, 'ADMIN');
    return createResponse(false, 'Error: ' + error.message, null, 500);
  }
}

/**
 * ดึงเมนูที่ขายดีที่สุด
 */
function getBestSellingItemsAPI() {
  try {
    const ss = getSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');
    const menuSheet = ss.getSheetByName('Menu');
    
    if (!ordersSheet || !menuSheet) {
      throw new Error('ไม่พบชีตที่จำเป็น');
    }
    
    // ดึงข้อมูลเมนู
    const menuData = menuSheet.getDataRange().getValues();
    const menuHeaders = menuData[0];
    const menuRows = menuData.slice(1);
    
    const menuMap = {};
    menuRows.forEach(row => {
      if (row[0]) {
        menuMap[row[0]] = {
          id: row[0],
          name: row[1] || 'ไม่ระบุชื่อ',
          category: row[2] || 'ทั่วไป',
          price: Number(row[3]) || 0
        };
      }
    });
    
    // ดึงข้อมูลออเดอร์
    const orderData = ordersSheet.getDataRange().getValues();
    const orderRows = orderData.slice(1);
    
    const salesCount = {};
    const salesRevenue = {};
    
    orderRows.forEach(row => {
      const status = row[6];
      if (status === 'Cancelled') return; // ไม่นับออเดอร์ที่ถูกยกเลิก
      
      const items = JSON.parse(row[2] || '[]');
      
      items.forEach(item => {
        const menuId = item.menuId || item.menuId;
        const quantity = item.quantity || 1;
        const totalPrice = item.totalPrice || 0;
        
        if (!salesCount[menuId]) {
          salesCount[menuId] = 0;
          salesRevenue[menuId] = 0;
        }
        
        salesCount[menuId] += quantity;
        salesRevenue[menuId] += totalPrice;
      });
    });
    
    // สร้างรายการขายดี
    const bestSelling = Object.keys(salesCount).map(menuId => {
      return {
        menuId: menuId,
        name: menuMap[menuId]?.name || 'ไม่พบเมนู',
        category: menuMap[menuId]?.category || 'อื่นๆ',
        quantity: salesCount[menuId],
        revenue: salesRevenue[menuId]
      };
    }).sort((a, b) => b.quantity - a.quantity);
    
    // แยกตามหมวดหมู่
    const byCategory = {};
    bestSelling.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    });
    
    logAction('ADMIN_GET_BEST_SELLING', 'Best selling items retrieved', 'ADMIN');
    
    return createResponse(true, 'Best selling items retrieved', {
      all: bestSelling.slice(0, 10),
      byCategory: byCategory
    });
    
  } catch (error) {
    logAction('ADMIN_GET_BEST_SELLING_ERROR', error.message, 'ADMIN');
    return createResponse(false, 'Error: ' + error.message, null, 500);
  }
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * สร้างชีต Inventory
 */
function createInventorySheet(ss) {
  let sheet = ss.getSheetByName('Inventory');
  
  if (!sheet) {
    sheet = ss.insertSheet('Inventory');
  } else {
    sheet.clear();
  }
  
  const headers = [
    ['id', 'name', 'category', 'unit', 'currentStock', 'minStock', 'maxStock', 'costPerUnit', 'lastUpdated']
  ];
  
  sheet.getRange('A1:I1').setValues(headers);
  sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  
  // ข้อมูลตัวอย่าง
  const sampleData = [
    ['INV001', 'เส้นเล็ก', 'เส้น', 'กิโลกรัม', 15, 5, 50, 25, new Date()],
    ['INV002', 'เส้นใหญ่', 'เส้น', 'กิโลกรัม', 8, 5, 50, 25, new Date()],
    ['INV003', 'เส้นหมี่', 'เส้น', 'กิโลกรัม', 12, 5, 50, 25, new Date()],
    ['INV004', 'หมูสไลด์', 'เนื้อ', 'กิโลกรัม', 6, 3, 30, 120, new Date()],
    ['INV005', 'ลูกชิ้น', 'เนื้อ', 'ลูก', 200, 50, 500, 3, new Date()],
    ['INV006', 'ไข่ไก่', 'ของสด', 'ฟอง', 80, 30, 200, 4, new Date()],
    ['INV007', 'ผักชี', 'ผัก', 'กิโลกรัม', 2, 1, 5, 50, new Date()],
    ['INV008', 'ถั่วงอก', 'ผัก', 'กิโลกรัม', 3, 1, 10, 20, new Date()]
  ];
  
  sheet.getRange(2, 1, sampleData.length, 9).setValues(sampleData);
  sheet.setFrozenRows(1);
  
  Logger.log('✓ Inventory sheet created');
}

/**
 * ดึงสถานะสต็อก
 */
function getInventoryStatusAPI() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('Inventory');
    
    // ถ้ายังไม่มีชีต Inventory ให้สร้าง
    if (!sheet) {
      createInventorySheet(ss);
      sheet = ss.getSheetByName('Inventory');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const inventory = rows.map(row => {
      return {
        id: row[0],
        name: row[1],
        category: row[2],
        unit: row[3],
        currentStock: Number(row[4]) || 0,
        minStock: Number(row[5]) || 0,
        maxStock: Number(row[6]) || 0,
        costPerUnit: Number(row[7]) || 0,
        lastUpdated: row[8],
        status: getStockStatus(Number(row[4]) || 0, Number(row[5]) || 0),
        needsRestock: (Number(row[4]) || 0) <= (Number(row[5]) || 0)
      };
    });
    
    // แยกตามหมวดหมู่
    const categories = {};
    inventory.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });
    
    // สินค้าที่ใกล้หมด
    const lowStock = inventory.filter(item => item.needsRestock);
    
    logAction('ADMIN_GET_INVENTORY', `Retrieved ${inventory.length} items`, 'ADMIN');
    
    return createResponse(true, 'Inventory retrieved', {
      all: inventory,
      byCategory: categories,
      lowStock: lowStock,
      lowStockCount: lowStock.length
    });
    
  } catch (error) {
    logAction('ADMIN_GET_INVENTORY_ERROR', error.message, 'ADMIN');
    return createResponse(false, 'Error: ' + error.message, null, 500);
  }
}

/**
 * ตรวจสอบสถานะสต็อก
 */
function getStockStatus(current, min) {
  if (current <= 0) return 'out';
  if (current <= min) return 'low';
  if (current <= min * 2) return 'medium';
  return 'high';
}

/**
 * Admin อัปเดตสต็อก
 */
function adminUpdateInventory(itemId, newQuantity, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Inventory');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Inventory');
    }
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    let oldQuantity = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        foundRow = i + 1;
        oldQuantity = Number(data[i][4]) || 0;
        break;
      }
    }
    
    if (foundRow === -1) {
      throw new Error(`ไม่พบสินค้า: ${itemId}`);
    }
    
    // อัปเดตจำนวน
    sheet.getRange(foundRow, 5).setValue(newQuantity); // currentStock
    sheet.getRange(foundRow, 9).setValue(new Date()); // lastUpdated
    
    logAction('ADMIN_UPDATE_INVENTORY', `Item ${itemId}: ${oldQuantity} -> ${newQuantity} by ${adminId}`, adminId);
    
    return {
      success: true,
      itemId: itemId,
      oldQuantity: oldQuantity,
      newQuantity: newQuantity
    };
    
  } catch (error) {
    logAction('ADMIN_UPDATE_INVENTORY_ERROR', error.message, adminId);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * เพิ่มรายการสินค้าใหม่
 */
function adminAddInventoryItem(itemData, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Inventory');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Inventory');
    }
    
    const newId = 'INV' + String(Date.now()).slice(-6);
    
    sheet.appendRow([
      newId,
      itemData.name || 'สินค้าใหม่',
      itemData.category || 'ทั่วไป',
      itemData.unit || 'ชิ้น',
      itemData.currentStock || 0,
      itemData.minStock || 0,
      itemData.maxStock || 100,
      itemData.costPerUnit || 0,
      new Date()
    ]);
    
    logAction('ADMIN_ADD_INVENTORY', `Added new item: ${itemData.name} by ${adminId}`, adminId);
    
    return {
      success: true,
      itemId: newId,
      name: itemData.name
    };
    
  } catch (error) {
    logAction('ADMIN_ADD_INVENTORY_ERROR', error.message, adminId);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * อัปเดตสต็อกจากออเดอร์ที่เสร็จแล้ว
 */
function updateInventoryFromOrder(orderData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Inventory');
    
    if (!sheet) return;
    
    // ดึงข้อมูลสต็อกปัจจุบัน
    const data = sheet.getDataRange().getValues();
    const inventory = {};
    
    for (let i = 1; i < data.length; i++) {
      inventory[data[i][1]] = { // name -> row
        row: i + 1,
        current: Number(data[i][4]) || 0
      };
    }
    
    // ลดสต็อกตามออเดอร์ (ตัวอย่างง่ายๆ)
    orderData.items.forEach(item => {
      const menuName = item.menuName || '';
      
      // ถ้าเป็นก๋วยเตี๋ยว
      if (menuName.includes('ก๋วยเตี๋ยว')) {
        if (inventory['เส้นเล็ก']) {
          const newQty = Math.max(0, inventory['เส้นเล็ก'].current - (item.quantity * 0.2));
          sheet.getRange(inventory['เส้นเล็ก'].row, 5).setValue(newQty);
        }
      }
      
      // ถ้ามีเนื้อพิเศษ
      if (item.options && item.options.some(opt => opt.includes('เนื้อพิเศษ'))) {
        if (inventory['หมูสไลด์']) {
          const newQty = Math.max(0, inventory['หมูสไลด์'].current - (item.quantity * 0.1));
          sheet.getRange(inventory['หมูสไลด์'].row, 5).setValue(newQty);
        }
      }
    });
    
    logAction('INVENTORY_UPDATE', 'Inventory updated from order', 'SYSTEM');
    
  } catch (error) {
    logAction('INVENTORY_UPDATE_ERROR', error.message, 'SYSTEM');
  }
}

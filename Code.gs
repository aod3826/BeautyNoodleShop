/**
 * Beauty Noodle Shop - Backend System (Complete Version with LINE Messaging API)
 * Google Apps Script Backend for Restaurant Management
 * 
 * @version 8.0.0
 * @lastUpdated 2024
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
  
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
  
  // สร้าง Admin Token สำหรับ Authentication
  const adminToken = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', adminToken);
  
  // สร้าง API Key สำหรับ JSONP
  const apiKey = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('API_KEY', apiKey);
  
  // ตั้งค่า Admin credentials เริ่มต้น (ควรเปลี่ยนทันที)
  PropertiesService.getScriptProperties().setProperty('ADMIN_USER', 'admin');
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASS', '123');
  
  // สร้างฐานข้อมูล
  setupDatabase();
  
  Logger.log('✅ Initial setup completed successfully.');
  Logger.log('Spreadsheet ID: ' + spreadsheetId);
  Logger.log('Admin Token: ' + adminToken);
  Logger.log('API Key: ' + apiKey);
  Logger.log('⚠️ กรุณาเปลี่ยนรหัสผ่าน admin ทันทีหลังจากติดตั้ง!');
}
/**
 * ตั้งค่า LINE Messaging API แบบปลอดภัย
 * @param {Object} config - (Optional) ข้อมูลที่ส่งมาจากหน้า Admin
 */
function setupLineMessaging(config) {
  try {
    const props = PropertiesService.getScriptProperties();
    
    // 1. ตรวจสอบแหล่งที่มาของข้อมูล
    // ถ้าไม่มี config ส่งมา (เช่น กดรันเองใน Editor) ให้ใช้ค่าที่เรากำหนดไว้ตรงนี้
    const lineData = config || {
      token: 'QURA7S8NmooH+K4Jqdn9kl7PaVQoJHaYni2MDKFLxwXPq5iGZfp9s1ejyy/Os7VlzFlfG2FwEgtVhF7hSl74nVLbkVp49aIG3uPYdDGvJlHyaWLDtoHo4l77r7iSbNO5xy95/0oykmA29B/VWQ4gYwdB04t89/1O/w1cDnyilFU=',
      secret: '9761252456083b6fb0fd80bcec9d4da8',
      groupId: 'U3511304d07c24cf513e4f0eb2cb5e02f'
    };

    // 2. บันทึกค่าลง Script Properties
    if (lineData.token) props.setProperty('LINE_CHANNEL_ACCESS_TOKEN', lineData.token);
    if (lineData.secret) props.setProperty('LINE_CHANNEL_SECRET', lineData.secret);
    if (lineData.groupId) props.setProperty('LINE_GROUP_ID', lineData.groupId);

    // 3. ทดสอบการส่งข้อความ (ใช้ Logger แทน UI Alert)
    const testResult = sendLineTestMessage();
    
    if (testResult) {
      Logger.log('✅ LINE Setup Success: ทดสอบส่งข้อความสำเร็จ');
      return { success: true, message: 'ตั้งค่าและเชื่อมต่อ LINE สำเร็จ' };
    } else {
      Logger.log('⚠️ LINE Setup Warning: บันทึกค่าแล้ว แต่ส่งข้อความทดสอบไม่สำเร็จ');
      return { success: false, message: 'บันทึกค่าแล้ว แต่เชื่อมต่อ LINE ไม่สำเร็จ' };
    }

  } catch (e) {
    Logger.log('❌ LINE Setup Error: ' + e.toString());
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + e.message };
  }
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

/**
 * ตรวจสอบ Admin Token
 */
function verifyAdminToken(token) {
  const validToken = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  return token === validToken;
}

/**
 * ตรวจสอบ API Key
 */
function verifyApiKey(key) {
  const validKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  return key === validKey;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const requestCounts = {};

function checkRateLimit(userId = 'anonymous') {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = userId + '_' + minute;
  
  requestCounts[key] = (requestCounts[key] || 0) + 1;
  
  // จำกัด 100 requests ต่อนาที
  if (requestCounts[key] > 100) {
    throw new Error('Too many requests. Please try again later.');
  }
  
  // Clean up old entries (keep last 10 minutes)
  Object.keys(requestCounts).forEach(k => {
    const [_, ts] = k.split('_');
    if (parseInt(ts) < minute - 10) {
      delete requestCounts[k];
    }
  });
}

// ============================================================================
// DATABASE SETUP
// ============================================================================

/**
 * สร้างโครงสร้างฐานข้อมูลทั้งหมด (ถ้ายังไม่มี)
 */
function setupDatabase() {
  try {
    const ss = getSpreadsheet();
    
    createConfigSheet(ss);
    createMenuSheet(ss);
    createOrdersSheet(ss);
    createLogsSheet(ss);
    createInventorySheet(ss);
    createCustomersSheet(ss);
    
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
    sheet.getRange('A1:B1').setValues([['key', 'value']]);
    sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    
    const configData = [
      ['shopName', 'Beauty Noodle Shop'],
      ['isOpen', 'true'],
      ['liffId', ''],
      ['taxRate', '0.07'],
      ['serviceCharge', '0'],
      ['currency', 'THB'],
      ['phoneNumber', '081-234-5678'],
      ['openTime', '08:00'],
      ['closeTime', '20:00'],
      ['address', '123 ถนนสุขุมวิท กรุงเทพฯ'],
      ['facebook', ''],
      ['instagram', ''],
      ['lineOfficial', '@beautynoodle']
    ];
    
    sheet.getRange(2, 1, configData.length, 2).setValues(configData);
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Config sheet ready');
}

/**
 * สร้างชีต Menu
 */
function createMenuSheet(ss) {
  let sheet = ss.getSheetByName('Menu');
  
  if (!sheet) {
    sheet = ss.insertSheet('Menu');
    const headers = [['id', 'name', 'category', 'price', 'options_json', 'status', 'image_url', 'description', 'ingredients', 'sort_order', 'created_at', 'updated_at']];
    sheet.getRange('A1:L1').setValues(headers);
    sheet.getRange('A1:L1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
    
    // เพิ่มข้อมูลตัวอย่าง
    const now = new Date();
    const sampleData = [
      ['M001', 'ก๋วยเตี๋ยวหมูน้ำใส', 'ก๋วยเตี๋ยว', 45, JSON.stringify([
        {type: 'noodle', name: 'เลือกเส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น', 'บะหมี่']},
        {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ลูกชิ้น +10', 'หมูกรอบ +15', 'ไข่ต้ม +10']}
      ]), 'active', 'https://images.unsplash.com/photo-1559310541-2b2f7c3d3b3d?w=400', 'น้ำซุปใส หอมกลิ่นเครื่องเทศ', 'เส้นเล็ก,หมูสับ,ลูกชิ้น,ผักชี', 1, now, now],
      
      ['M002', 'ก๋วยเตี๋ยวต้มยำหมู', 'ก๋วยเตี๋ยว', 55, JSON.stringify([
        {type: 'noodle', name: 'เลือกเส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น', 'บะหมี่']},
        {type: 'spice', name: 'ระดับความเผ็ด', choices: ['ไม่เผ็ด', 'เผ็ดน้อย', 'เผ็ดกลาง', 'เผ็ดมาก']},
        {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ลูกชิ้น +10', 'หมูกรอบ +15', 'ไข่ต้ม +10']}
      ]), 'active', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', 'ต้มยำน้ำข้น รสจัดจ้าน', 'เส้นเล็ก,หมูสับ,น้ำตก,พริกป่น', 2, now, now],
      
      ['M003', 'ข้าวหมูกรอบ', 'ข้าว', 50, JSON.stringify([
        {type: 'addon', name: 'เพิ่มเติม', choices: ['ไข่ดาว +10', 'พิเศษ +20']}
      ]), 'active', 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=400', 'ข้าวหมูกรอบ หนังกรอบ เนื้อนุ่ม', 'ข้าวสวย,หมูกรอบ,ไข่ต้ม,แตงกวา', 3, now, now]
    ];
    
    sheet.getRange(2, 1, sampleData.length, 12).setValues(sampleData);
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Menu sheet ready');
}

/**
 * สร้างชีต Orders
 */
function createOrdersSheet(ss) {
  let sheet = ss.getSheetByName('Orders');
  
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    const headers = [['orderId', 'userId', 'items_json', 'totalPrice', 'type', 'payment', 'status', 'timestamp', 'note', 'last_updated', 'customer_name', 'customer_phone']];
    sheet.getRange('A1:L1').setValues(headers);
    sheet.getRange('A1:L1').setFontWeight('bold').setBackground('#fbbc04').setFontColor('#000000');
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Orders sheet ready');
}

/**
 * สร้างชีต Logs
 */
function createLogsSheet(ss) {
  let sheet = ss.getSheetByName('Logs');
  
  if (!sheet) {
    sheet = ss.insertSheet('Logs');
    const headers = [['timestamp', 'userId', 'action', 'details', 'ip_address', 'user_agent']];
    sheet.getRange('A1:F1').setValues(headers);
    sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Logs sheet ready');
}

/**
 * สร้างชีต Inventory
 */
function createInventorySheet(ss) {
  let sheet = ss.getSheetByName('Inventory');
  
  if (!sheet) {
    sheet = ss.insertSheet('Inventory');
    const headers = [['id', 'name', 'category', 'unit', 'currentStock', 'minStock', 'maxStock', 'costPerUnit', 'lastUpdated', 'supplier', 'location']];
    sheet.getRange('A1:K1').setValues(headers);
    sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
    
    // ข้อมูลตัวอย่าง
    const now = new Date();
    const sampleData = [
      ['INV001', 'เส้นเล็ก', 'เส้น', 'kg', 15, 5, 50, 25, now, 'บริษัท เส้นสด จำกัด', 'โซน A-01'],
      ['INV002', 'เส้นใหญ่', 'เส้น', 'kg', 8, 5, 50, 25, now, 'บริษัท เส้นสด จำกัด', 'โซน A-02'],
      ['INV003', 'หมูสไลด์', 'เนื้อ', 'kg', 6, 3, 30, 120, now, 'CPF', 'โซน B-01'],
      ['INV004', 'ลูกชิ้น', 'เนื้อ', 'ลูก', 200, 50, 500, 3, now, 'เบทาโกร', 'โซน B-02'],
      ['INV005', 'ไข่ไก่', 'ของสด', 'ฟอง', 80, 30, 200, 4, now, 'เจริญโภคภัณฑ์', 'โซน C-01'],
      ['INV006', 'ผักชี', 'ผัก', 'kg', 2, 1, 5, 50, now, 'ตลาดสด', 'โซน C-02']
    ];
    
    sheet.getRange(2, 1, sampleData.length, 11).setValues(sampleData);
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Inventory sheet ready');
}

/**
 * สร้างชีต Customers
 */
function createCustomersSheet(ss) {
  let sheet = ss.getSheetByName('Customers');
  
  if (!sheet) {
    sheet = ss.insertSheet('Customers');
    const headers = [['userId', 'name', 'phone', 'email', 'totalSpent', 'orderCount', 'lastOrder', 'createdAt', 'notes']];
    sheet.getRange('A1:I1').setValues(headers);
    sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#9c27b0').setFontColor('#ffffff');
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Customers sheet ready');
}

// ============================================================================
// API ENDPOINTS - doGet
// ============================================================================

/**
 * GET API - จัดการทุกคำขอแบบ GET รองรับ JSONP
 */
function doGet(e) {
  try {
    // Rate limiting
    const userId = e?.parameter?.userId || 'anonymous';
    checkRateLimit(userId);
    
    // ตรวจสอบว่ามี callback หรือไม่ (JSONP request)
    const isJSONP = e && e.parameter && e.parameter.callback;
    const callback = isJSONP ? e.parameter.callback : null;
    
    // ถ้าไม่มี action หรือขอหน้าเว็บ
    if (!e || !e.parameter || !e.parameter.action) {
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Beauty Noodle Shop')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const action = e.parameter.action;
    
    // ถ้าขอหน้า admin
    if (action === 'admin') {
      return HtmlService.createTemplateFromFile('admin')
        .evaluate()
        .setTitle('Beauty Noodle - Admin Dashboard')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // API calls
    let result;
    
    try {
      if (action === 'getMenu') {
        result = getMenuData();
      } else if (action === 'getShopStatus') {
        result = getShopStatusData();
      } else if (action === 'getOrder') {
        result = getOrderData(e.parameter.orderId);
      } else if (action === 'getUserOrders') {
        result = getUserOrdersData(e.parameter.userId);
      } else if (action === 'getAllOrders') {
        if (!verifyApiKey(e.parameter.key) && !verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getAllOrdersData(e.parameter);
        }
      } else if (action === 'getDashboardStats') {
        if (!verifyApiKey(e.parameter.key) && !verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getDashboardStatsData();
        }
      } else if (action === 'getInventoryStatus') {
        if (!verifyApiKey(e.parameter.key) && !verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getInventoryStatusData();
        }
      } else if (action === 'adminGetAllMenus') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminGetAllMenus();
        }
      } else if (action === 'checkNewOrders') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = checkNewOrders(parseInt(e.parameter.lastCount) || 0);
        }
      } else if (action === 'getBestSellingItems') {
        if (!verifyApiKey(e.parameter.key) && !verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getBestSellingItems();
        }
      } else if (action === 'exportOrders') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          return exportOrdersAsCSV(e.parameter);
        }
      } else if (action === 'getCustomerStats') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getCustomerStats();
        }
      } else {
        result = { success: false, error: 'Invalid action' };
      }
    } catch (error) {
      result = { success: false, error: error.message };
    }
    
    // ถ้าเป็น JSONP request
    if (isJSONP) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    // ปกติ JSON response
    return createJSONResponse(result);
    
  } catch (error) {
    logAction('GET_ERROR', error.message, 'SYSTEM');
    
    if (e && e.parameter && e.parameter.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + '({"success":false,"error":"' + error.message + '"})')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return createJSONResponse({ success: false, error: error.message });
  }
}

// ============================================================================
// API ENDPOINTS - doPost
// ============================================================================

/**
 * POST API - จัดการทุกคำขอแบบ POST
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const payload = JSON.parse(e.postData.contents);
    
    // Rate limiting
    const userId = payload.userId || payload.adminId || 'anonymous';
    checkRateLimit(userId);
    
    // LINE Webhook (ต้องตรวจสอบก่อน)
    if (payload.events && Array.isArray(payload.events)) {
      lock.releaseLock();
      return handleLineWebhook(payload);
    }
    
    const action = payload.action;
    let result;
    
    try {
      // Customer endpoints
      if (action === 'saveOrder') {
        result = saveOrderData(payload);
      } else if (action === 'updateCustomer') {
        result = updateCustomerData(payload);
      } 
      // Admin login
      else if (action === 'adminLogin') {
        result = adminLogin(payload.username, payload.password);
      }
      // Admin endpoints
      else if (action === 'adminUpdateOrderStatus') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateOrderStatus(payload.orderId, payload.status, payload.adminId);
        }
      } else if (action === 'adminDeleteOrder') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminDeleteOrder(payload.orderId, payload.adminId);
        }
      } else if (action === 'adminUpdateInventory') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateInventory(payload.itemId, payload.quantity, payload.adminId);
        }
      } else if (action === 'adminAddInventoryItem') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminAddInventoryItem(payload.itemData, payload.adminId);
        }
      } else if (action === 'adminToggleShopStatus') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminToggleShopStatus(payload.isOpen, payload.adminId);
        }
      } else if (action === 'adminAddMenu') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminAddMenu(payload.menuData, payload.adminId);
        }
      } else if (action === 'adminUpdateMenu') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateMenu(payload.menuData, payload.adminId);
        }
      } else if (action === 'adminQuickAdjustInventory') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminQuickAdjustInventory(payload.itemId, payload.change, payload.adminId);
        }
      } else if (action === 'adminBulkUpdateStatus') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminBulkUpdateStatus(payload.orderIds, payload.status, payload.adminId);
        }
      } else if (action === 'saveLineSettings') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = saveLineSettings(payload);
        }
      } else if (action === 'testLine') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = { success: sendLineTestMessage() };
        }
      } else if (action === 'lineBroadcast') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = { success: sendLineBroadcast(payload.message, payload.imageUrl, payload.urgent) };
        }
      } else if (action === 'logError') {
        // ไม่ต้องใช้ token สำหรับ error logging
        logAction('CLIENT_ERROR', JSON.stringify(payload.error), payload.userId || 'anonymous');
        result = { success: true };
      } else {
        result = { success: false, error: 'Invalid action' };
      }
    } catch (error) {
      result = { success: false, error: error.message };
    }
    
    lock.releaseLock();
    
    return createJSONResponse(result);
    
  } catch (error) {
    lock.releaseLock();
    logAction('POST_ERROR', error.message, 'SYSTEM');
    return createJSONResponse({ success: false, error: error.message });
  }
}

// ============================================================================
// DATA FUNCTIONS
// ============================================================================

/**
 * ดึงข้อมูลเมนู
 */
function getMenuData() {
  try {
    const menu = getMenuItemsWithDetails();
    logAction('GET_MENU', `Returned ${menu.length} items`, 'SYSTEM');
    
    return {
      success: true,
      data: {
        menu: menu,
        total: menu.length,
        categories: [...new Set(menu.map(item => item.category))]
      }
    };
    
  } catch (error) {
    logAction('GET_MENU_ERROR', error.message, 'SYSTEM');
    throw error;
  }
}

/**
 * ดึงข้อมูลเมนูแบบละเอียด (พร้อม cache)
 */
function getMenuItemsWithDetails() {
  try {
    // Try cache first
    const cache = CacheService.getScriptCache();
    const cached = cache.get('menu_items');
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const categoryIndex = headers.indexOf('category');
    const priceIndex = headers.indexOf('price');
    const optionsIndex = headers.indexOf('options_json');
    const statusIndex = headers.indexOf('status');
    const imageIndex = headers.indexOf('image_url');
    const descIndex = headers.indexOf('description');
    const ingredientsIndex = headers.indexOf('ingredients');
    const sortOrderIndex = headers.indexOf('sort_order');
    
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
        imageUrl: imageIndex !== -1 ? row[imageIndex] : null,
        description: descIndex !== -1 ? row[descIndex] : '',
        ingredients: ingredientsIndex !== -1 ? row[ingredientsIndex] : '',
        status: statusIndex !== -1 ? row[statusIndex] : 'active',
        sortOrder: sortOrderIndex !== -1 ? row[sortOrderIndex] || 999 : 999
      });
    }
    
    // Sort by sortOrder
    menu.sort((a, b) => a.sortOrder - b.sortOrder);
    
    // Cache for 5 minutes
    cache.put('menu_items', JSON.stringify(menu), 300);
    
    return menu;
    
  } catch (error) {
    logAction('GET_MENU_ITEMS_ERROR', error.message, 'SYSTEM');
    return [];
  }
}

/**
 * ดึงข้อมูลสถานะร้าน
 */
function getShopStatusData() {
  try {
    const config = getConfig();
    const isOpenByConfig = parseConfigBoolean(config.isOpen);

    return {
      success: true,
      data: {
        shopName: config.shopName || 'Beauty Noodle Shop',
        isOpen: isOpenByConfig,
        liffId: config.liffId || '',
        currency: config.currency || 'THB',
        phoneNumber: config.phoneNumber || '081-234-5678',
        openTime: config.openTime || '08:00',
        closeTime: config.closeTime || '20:00',
        address: config.address || '',
        lineOfficial: config.lineOfficial || '@beautynoodle'
      }
    };
    
  } catch (error) {
    logAction('GET_SHOP_STATUS_ERROR', error.message, 'SYSTEM');
    throw error;
  }
}

/**
 * ดึงค่า Config ทั้งหมด
 */
function getConfig() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');
    
    if (!sheet) return {};
    
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
 * แปลงค่า config เป็น boolean
 */
function parseConfigBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  return String(value).trim().toLowerCase() === 'true';
}

/**
 * ดึงข้อมูลออเดอร์ตาม ID
 */
function getOrderData(orderId) {
  const order = getOrderById(orderId);
  if (order) {
    return { success: true, data: { order: order } };
  } else {
    return { success: false, error: 'Order not found' };
  }
}

/**
 * ดึงข้อมูลออเดอร์ตาม User ID
 */
function getUserOrdersData(userId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    const data = sheet.getDataRange().getValues();
    
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId) {
        orders.push({
          orderId: data[i][0],
          totalPrice: Number(data[i][3]),
          status: data[i][6],
          timestamp: data[i][7]
        });
      }
    }
    
    return { success: true, data: { orders: orders } };
    
  } catch (error) {
    throw error;
  }
}

/**
 * ดึงข้อมูลออเดอร์ทั้งหมด (สำหรับ admin)
 */
function getAllOrdersData(params) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      throw new Error('Orders sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const filterStatus = params.status;
    const startDate = params.startDate ? new Date(params.startDate) : null;
    const endDate = params.endDate ? new Date(params.endDate) : null;
    
    const orders = rows.map(row => ({
      orderId: row[0],
      userId: row[1],
      items: JSON.parse(row[2] || '[]'),
      totalPrice: Number(row[3]),
      type: row[4],
      payment: row[5],
      status: row[6],
      timestamp: row[7],
      note: row[8] || '',
      lastUpdated: row[9] || row[7],
      customerName: row[10] || '',
      customerPhone: row[11] || ''
    })).filter(order => {
      if (filterStatus && filterStatus !== 'all') {
        if (order.status !== filterStatus) return false;
      }
      
      if (startDate) {
        const orderDate = new Date(order.timestamp);
        if (orderDate < startDate) return false;
      }
      
      if (endDate) {
        const orderDate = new Date(order.timestamp);
        if (orderDate > endDate) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { success: true, data: { orders: orders } };
    
  } catch (error) {
    throw error;
  }
}

/**
 * ดึงข้อมูลสถิติสำหรับ dashboard
 */
function getDashboardStatsData() {
  try {
    const ss = getSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');
    
    if (!ordersSheet) {
      throw new Error('Orders sheet not found');
    }
    
    const data = ordersSheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = {
      totalOrders: 0,
      totalRevenue: 0,
      todayOrders: 0,
      todayRevenue: 0,
      pendingOrders: 0,
      preparingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      averageOrderValue: 0
    };
    
    rows.forEach(row => {
      const orderDate = new Date(row[7]);
      const status = row[6] || 'Pending';
      const totalPrice = Number(row[3]) || 0;
      
      stats.totalOrders++;
      stats.totalRevenue += totalPrice;
      
      if (status === 'Pending') stats.pendingOrders++;
      else if (status === 'Preparing' || status === 'Confirmed') stats.preparingOrders++;
      else if (status === 'Completed') stats.completedOrders++;
      else if (status === 'Cancelled') stats.cancelledOrders++;
      
      if (orderDate >= today) {
        stats.todayOrders++;
        stats.todayRevenue += totalPrice;
      }
    });
    
    stats.averageOrderValue = stats.totalOrders > 0 
      ? Math.round(stats.totalRevenue / stats.totalOrders) 
      : 0;
    
    return { success: true, data: stats };
    
  } catch (error) {
    throw error;
  }
}

/**
 * ดึงข้อมูลสต็อก
 */
function getInventoryStatusData() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('Inventory');
    
    if (!sheet) {
      createInventorySheet(ss);
      sheet = ss.getSheetByName('Inventory');
    }
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const inventory = rows.map(row => ({
      id: row[0],
      name: row[1],
      category: row[2],
      unit: row[3],
      currentStock: Number(row[4]) || 0,
      minStock: Number(row[5]) || 0,
      maxStock: Number(row[6]) || 0,
      costPerUnit: Number(row[7]) || 0,
      lastUpdated: row[8],
      supplier: row[9] || '',
      location: row[10] || '',
      status: getStockStatus(Number(row[4]) || 0, Number(row[5]) || 0)
    }));
    
    const lowStock = inventory.filter(item => item.currentStock <= item.minStock);
    const outOfStock = inventory.filter(item => item.currentStock <= 0);
    
    return { 
      success: true, 
      data: {
        all: inventory,
        lowStock: lowStock,
        lowStockCount: lowStock.length,
        outOfStock: outOfStock,
        outOfStockCount: outOfStock.length,
        totalValue: inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0)
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * ดึงข้อมูลเมนูขายดี
 */
function getBestSellingItems() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      return { success: true, data: { all: [] } };
    }
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const itemCounts = {};
    const itemRevenue = {};
    
    rows.forEach(row => {
      const items = JSON.parse(row[2] || '[]');
      items.forEach(item => {
        const key = item.menuId + '|' + item.menuName;
        itemCounts[key] = (itemCounts[key] || 0) + item.quantity;
        itemRevenue[key] = (itemRevenue[key] || 0) + item.totalPrice;
      });
    });
    
    const bestSelling = Object.entries(itemCounts)
      .map(([key, quantity]) => {
        const [id, name] = key.split('|');
        return { 
          id, 
          name, 
          quantity,
          revenue: itemRevenue[key] || 0
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);
    
    return { success: true, data: { all: bestSelling } };
    
  } catch (error) {
    logAction('BEST_SELLING_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูลลูกค้า
 */
function getCustomerStats() {
  try {
    const ss = getSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');
    const customersSheet = ss.getSheetByName('Customers');
    
    if (!ordersSheet) {
      return { success: true, data: { total: 0, new: 0, returning: 0 } };
    }
    
    const orders = ordersSheet.getDataRange().getValues().slice(1);
    
    const customerMap = new Map();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    
    orders.forEach(row => {
      const userId = row[1];
      const totalPrice = Number(row[3]) || 0;
      const timestamp = new Date(row[7]);
      
      if (!customerMap.has(userId)) {
        customerMap.set(userId, {
          userId: userId,
          orderCount: 0,
          totalSpent: 0,
          firstOrder: timestamp,
          lastOrder: timestamp
        });
      }
      
      const customer = customerMap.get(userId);
      customer.orderCount++;
      customer.totalSpent += totalPrice;
      if (timestamp > customer.lastOrder) customer.lastOrder = timestamp;
      if (timestamp < customer.firstOrder) customer.firstOrder = timestamp;
    });
    
    const customers = Array.from(customerMap.values());
    const newCustomers = customers.filter(c => c.firstOrder >= thirtyDaysAgo).length;
    const returningCustomers = customers.filter(c => c.orderCount > 1).length;
    
    // Update customers sheet
    if (customersSheet) {
      const customerRows = customers.map(c => [
        c.userId,
        '', // name
        '', // phone
        '', // email
        c.totalSpent,
        c.orderCount,
        c.lastOrder,
        c.firstOrder,
        ''
      ]);
      
      if (customerRows.length > 0) {
        customersSheet.getRange(2, 1, customerRows.length, 9).setValues(customerRows);
      }
    }
    
    return {
      success: true,
      data: {
        total: customers.length,
        new: newCustomers,
        returning: returningCustomers,
        averageSpent: customers.length > 0 
          ? Math.round(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length) 
          : 0
      }
    };
    
  } catch (error) {
    logAction('CUSTOMER_STATS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * บันทึกข้อมูลออเดอร์ใหม่
 */
function saveOrderData(orderData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Orders');
    }
    
    if (!orderData.userId || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('ข้อมูลออเดอร์ไม่ถูกต้อง');
    }
    
    const menuItems = getMenuItemsWithDetails();
    let totalPrice = 0;
    const processedItems = [];
    
    for (const item of orderData.items) {
      const menuItem = menuItems.find(m => m.id === item.menuId);
      if (!menuItem) {
        throw new Error(`ไม่พบเมนู ID: ${item.menuId}`);
      }
      
      let itemPrice = menuItem.price;
      let optionsPrice = 0;
      const optionsWithPrice = (item.selectedOptions || []).map(opt => {
        const match = opt.match(/\+(\d+)/);
        if (match) optionsPrice += parseInt(match[1]);
        return opt;
      });
      
      itemPrice += optionsPrice;
      const totalItemPrice = itemPrice * (item.quantity || 1);
      totalPrice += totalItemPrice;
      
      processedItems.push({
        menuId: item.menuId,
        menuName: menuItem.name,
        quantity: item.quantity || 1,
        basePrice: menuItem.price,
        options: optionsWithPrice,
        optionsPrice: optionsPrice,
        totalPrice: totalItemPrice
      });
    }
    
    const orderId = generateOrderId();
    const timestamp = new Date();
    
    sheet.appendRow([
      orderId,
      orderData.userId || 'Guest',
      JSON.stringify(processedItems),
      totalPrice,
      orderData.type || 'dine-in',
      orderData.payment || 'cash',
      'Pending',
      timestamp,
      orderData.note || '',
      timestamp,
      orderData.customerName || '',
      orderData.customerPhone || ''
    ]);
    
    // Update inventory (ลดสต็อก)
    updateInventoryFromOrder(processedItems);
    
    logAction('SAVE_ORDER', `Order ${orderId} created - Total: ${totalPrice}฿`, orderData.userId);
    
    // ส่ง LINE Notification ด้วย Flex Message
    try {
      const lineConfig = getLineConfig();
      if (lineConfig.channelAccessToken && lineConfig.groupId) {
        // ลองส่ง Flex Message ก่อน
        const flexSuccess = sendLineFlexMessage({
          orderId: orderId,
          items: processedItems,
          totalPrice: totalPrice,
          type: orderData.type,
          payment: orderData.payment,
          note: orderData.note
        });
        
        if (!flexSuccess) {
          // ถ้า Flex ล้มเหลว ส่ง Text แทน
          sendLineTextMessage({
            orderId: orderId,
            items: processedItems,
            totalPrice: totalPrice,
            type: orderData.type,
            payment: orderData.payment
          });
        }
      }
    } catch (lineError) {
      logAction('LINE_ERROR', `LINE failed: ${lineError.message}`, 'SYSTEM');
    }
    
    return {
      success: true,
      data: {
        orderId: orderId,
        totalPrice: totalPrice,
        timestamp: timestamp
      }
    };
    
  } catch (error) {
    logAction('SAVE_ORDER_ERROR', error.message, orderData?.userId || 'SYSTEM');
    throw error;
  }
}

/**
 * อัปเดตข้อมูลลูกค้า
 */
function updateCustomerData(customerData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Customers');
    
    if (!sheet) {
      createCustomersSheet(ss);
    }
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    let foundRow = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === customerData.userId) {
        foundRow = i + 2;
        break;
      }
    }
    
    if (foundRow === -1) {
      // New customer
      sheet.appendRow([
        customerData.userId,
        customerData.name || '',
        customerData.phone || '',
        customerData.email || '',
        0, // totalSpent
        0, // orderCount
        new Date(), // lastOrder
        new Date(), // createdAt
        customerData.notes || ''
      ]);
    } else {
      // Update existing
      if (customerData.name !== undefined) sheet.getRange(foundRow, 2).setValue(customerData.name);
      if (customerData.phone !== undefined) sheet.getRange(foundRow, 3).setValue(customerData.phone);
      if (customerData.email !== undefined) sheet.getRange(foundRow, 4).setValue(customerData.email);
      if (customerData.notes !== undefined) sheet.getRange(foundRow, 9).setValue(customerData.notes);
    }
    
    return { success: true };
    
  } catch (error) {
    logAction('UPDATE_CUSTOMER_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * อัปเดตสต็อกจากออเดอร์
 */
function updateInventoryFromOrder(items) {
  try {
    // This would need mapping from menu items to inventory items
    // For now, just log
    logAction('INVENTORY_UPDATE', 'Order inventory update triggered', 'SYSTEM');
    return true;
  } catch (error) {
    logAction('INVENTORY_UPDATE_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * สร้าง Order ID
 */
function generateOrderId() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BN${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

/**
 * ดึงข้อมูลออเดอร์ตาม ID
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
          customerName: data[i][10] || '',
          customerPhone: data[i][11] || ''
        };
      }
    }
    return null;
    
  } catch (error) {
    logAction('GET_ORDER_ERROR', error.message, 'SYSTEM');
    return null;
  }
}

/**
 * คำนวณสถานะสต็อก
 */
function getStockStatus(current, min) {
  if (current <= 0) return 'out';
  if (current <= min) return 'low';
  if (current <= min * 2) return 'medium';
  return 'high';
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Admin Login
 */
function adminLogin(username, password) {
  const properties = PropertiesService.getScriptProperties();
  const validUsername = properties.getProperty('ADMIN_USER') || 'admin';
  const validPassword = properties.getProperty('ADMIN_PASS') || '123';
  
  if (username === validUsername && password === validPassword) {
    const token = properties.getProperty('ADMIN_TOKEN');
    logAction('ADMIN_LOGIN', 'Login successful', username);
    return { success: true, data: { token: token } };
  }
  
  logAction('ADMIN_LOGIN_FAILED', `Failed login attempt for: ${username}`, 'SYSTEM');
  return { success: false, error: 'Invalid credentials' };
}

/**
 * Admin อัปเดตสถานะออเดอร์
 */
function adminUpdateOrderStatus(orderId, newStatus, adminId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) throw new Error('ไม่พบชีต Orders');
    
    const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`สถานะไม่ถูกต้อง: ${newStatus}`);
    }
    
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
    
    if (foundRow === -1) throw new Error(`ไม่พบออเดอร์: ${orderId}`);
    
    sheet.getRange(foundRow, 7).setValue(newStatus);
    sheet.getRange(foundRow, 10).setValue(new Date());
    
    logAction('ADMIN_UPDATE_STATUS', `Order ${orderId}: ${oldStatus} -> ${newStatus}`, adminId);
    
    // ส่ง LINE Notification เมื่อสถานะเปลี่ยน
    try {
      sendOrderStatusNotification(orderId, newStatus);
    } catch (lineError) {
      logAction('LINE_STATUS_ERROR', lineError.message, 'SYSTEM');
    }
    
    return { success: true, data: { orderId: orderId } };
    
  } catch (error) {
    logAction('ADMIN_UPDATE_STATUS_ERROR', error.message, adminId);
    throw error;
  }
}

/**
 * Admin ลบออเดอร์
 */
function adminDeleteOrder(orderId, adminId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) throw new Error('ไม่พบชีต Orders');
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        foundRow = i + 1;
        break;
      }
    }
    
    if (foundRow === -1) throw new Error(`ไม่พบออเดอร์: ${orderId}`);
    
    sheet.deleteRow(foundRow);
    logAction('ADMIN_DELETE_ORDER', `Order ${orderId} deleted`, adminId);
    
    return { success: true };
    
  } catch (error) {
    logAction('ADMIN_DELETE_ORDER_ERROR', error.message, adminId);
    throw error;
  }
}

/**
 * Admin อัปเดตสต็อก
 */
function adminUpdateInventory(itemId, newQuantity, adminId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Inventory');
    
    if (!sheet) throw new Error('ไม่พบชีต Inventory');
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        foundRow = i + 1;
        break;
      }
    }
    
    if (foundRow === -1) throw new Error(`ไม่พบสินค้า: ${itemId}`);
    
    sheet.getRange(foundRow, 5).setValue(newQuantity);
    sheet.getRange(foundRow, 9).setValue(new Date());
    
    logAction('ADMIN_UPDATE_INVENTORY', `Item ${itemId} updated to ${newQuantity}`, adminId);
    
    return { success: true };
    
  } catch (error) {
    logAction('ADMIN_UPDATE_INVENTORY_ERROR', error.message, adminId);
    throw error;
  }
}

/**
 * Admin เพิ่มสินค้าใหม่
 */
function adminAddInventoryItem(itemData, adminId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Inventory');
    
    if (!sheet) throw new Error('ไม่พบชีต Inventory');
    
    const newId = 'INV' + String(Date.now()).slice(-6);
    
    sheet.appendRow([
      newId,
      itemData.name,
      itemData.category,
      itemData.unit,
      itemData.currentStock || 0,
      itemData.minStock || 5,
      itemData.maxStock || 50,
      itemData.costPerUnit || 0,
      new Date(),
      itemData.supplier || '',
      itemData.location || ''
    ]);
    
    logAction('ADMIN_ADD_INVENTORY', `Added ${itemData.name}`, adminId);
    
    return { success: true, data: { itemId: newId } };
    
  } catch (error) {
    logAction('ADMIN_ADD_INVENTORY_ERROR', error.message, adminId);
    throw error;
  }
}

/**
 * Admin เปิด/ปิดร้าน
 */
function adminToggleShopStatus(isOpen, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Config');
    }
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'isOpen') {
        foundRow = i + 1;
        break;
      }
    }
    
    if (foundRow === -1) {
      sheet.appendRow(['isOpen', isOpen]);
    } else {
      sheet.getRange(foundRow, 2).setValue(isOpen);
    }
    
    logAction('ADMIN_TOGGLE_SHOP', `Shop status changed to: ${isOpen}`, adminId);
    
    return { 
      success: true, 
      data: { 
        isOpen: isOpen === 'true' || isOpen === true 
      } 
    };
    
  } catch (error) {
    logAction('ADMIN_TOGGLE_SHOP_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin เพิ่มเมนูใหม่
 */
function adminAddMenu(menuData, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Menu');
    }
    
    if (!menuData.id) {
      const lastId = getLastMenuId();
      const num = parseInt(lastId.replace('M', '')) + 1;
      menuData.id = 'M' + num.toString().padStart(3, '0');
    }
    
    if (!menuData.name || !menuData.category || !menuData.price) {
      throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, หมวดหมู่, ราคา)');
    }
    
    const optionsJson = menuData.options_json || '[]';
    const now = new Date();
    
    const newRow = [
      menuData.id,
      menuData.name,
      menuData.category,
      parseFloat(menuData.price) || 0,
      optionsJson,
      menuData.status || 'active',
      menuData.image_url || '',
      menuData.description || '',
      menuData.ingredients || '',
      menuData.sortOrder || 999,
      now,
      now
    ];
    
    sheet.appendRow(newRow);
    
    // Clear cache
    CacheService.getScriptCache().remove('menu_items');
    
    logAction('ADMIN_ADD_MENU', `Added menu: ${menuData.name} (${menuData.id})`, adminId);
    
    return { 
      success: true, 
      data: { 
        id: menuData.id,
        name: menuData.name 
      } 
    };
    
  } catch (error) {
    logAction('ADMIN_ADD_MENU_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin อัปเดตเมนู
 */
function adminUpdateMenu(menuData, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Menu');
    }
    
    if (!menuData.id) {
      throw new Error('กรุณาระบุ ID เมนู');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const categoryIndex = headers.indexOf('category');
    const priceIndex = headers.indexOf('price');
    const optionsIndex = headers.indexOf('options_json');
    const statusIndex = headers.indexOf('status');
    const imageIndex = headers.indexOf('image_url');
    const descIndex = headers.indexOf('description');
    const ingredientsIndex = headers.indexOf('ingredients');
    const sortOrderIndex = headers.indexOf('sort_order');
    const updatedAtIndex = headers.indexOf('updated_at');
    
    let foundRow = -1;
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][idIndex] === menuData.id) {
        foundRow = i + 2;
        break;
      }
    }
    
    if (foundRow === -1) {
      throw new Error(`ไม่พบเมนู ID: ${menuData.id}`);
    }
    
    if (menuData.name !== undefined) {
      sheet.getRange(foundRow, nameIndex + 1).setValue(menuData.name);
    }
    if (menuData.category !== undefined) {
      sheet.getRange(foundRow, categoryIndex + 1).setValue(menuData.category);
    }
    if (menuData.price !== undefined) {
      sheet.getRange(foundRow, priceIndex + 1).setValue(parseFloat(menuData.price) || 0);
    }
    if (menuData.options_json !== undefined) {
      sheet.getRange(foundRow, optionsIndex + 1).setValue(menuData.options_json);
    }
    if (menuData.status !== undefined) {
      sheet.getRange(foundRow, statusIndex + 1).setValue(menuData.status);
    }
    if (menuData.image_url !== undefined) {
      sheet.getRange(foundRow, imageIndex + 1).setValue(menuData.image_url);
    }
    if (menuData.description !== undefined) {
      sheet.getRange(foundRow, descIndex + 1).setValue(menuData.description);
    }
    if (menuData.ingredients !== undefined) {
      sheet.getRange(foundRow, ingredientsIndex + 1).setValue(menuData.ingredients);
    }
    if (menuData.sortOrder !== undefined) {
      sheet.getRange(foundRow, sortOrderIndex + 1).setValue(menuData.sortOrder);
    }
    
    // Update timestamp
    if (updatedAtIndex !== -1) {
      sheet.getRange(foundRow, updatedAtIndex + 1).setValue(new Date());
    }
    
    // Clear cache
    CacheService.getScriptCache().remove('menu_items');
    
    logAction('ADMIN_UPDATE_MENU', `Updated menu: ${menuData.id}`, adminId);
    
    return { success: true, data: { id: menuData.id } };
    
  } catch (error) {
    logAction('ADMIN_UPDATE_MENU_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * ดึงรายการเมนูทั้งหมด (สำหรับ Admin)
 */
function adminGetAllMenus() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) {
      return { success: true, data: { menu: [] } };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const categoryIndex = headers.indexOf('category');
    const priceIndex = headers.indexOf('price');
    const optionsIndex = headers.indexOf('options_json');
    const statusIndex = headers.indexOf('status');
    const imageIndex = headers.indexOf('image_url');
    const descIndex = headers.indexOf('description');
    const ingredientsIndex = headers.indexOf('ingredients');
    const sortOrderIndex = headers.indexOf('sort_order');
    const createdAtIndex = headers.indexOf('created_at');
    const updatedAtIndex = headers.indexOf('updated_at');
    
    const menu = rows.map(row => ({
      id: row[idIndex],
      name: row[nameIndex] || '',
      category: row[categoryIndex] || '',
      price: parseFloat(row[priceIndex]) || 0,
      options: row[optionsIndex] ? JSON.parse(row[optionsIndex] || '[]') : [],
      options_json: row[optionsIndex] || '[]',
      status: row[statusIndex] || 'active',
      imageUrl: row[imageIndex] || '',
      description: row[descIndex] || '',
      ingredients: row[ingredientsIndex] || '',
      sortOrder: row[sortOrderIndex] || 999,
      createdAt: row[createdAtIndex] || null,
      updatedAt: row[updatedAtIndex] || null
    })).sort((a, b) => a.sortOrder - b.sortOrder);
    
    return { 
      success: true, 
      data: { 
        menu: menu,
        total: menu.length 
      } 
    };
  } catch (error) {
    logAction('ADMIN_GET_MENUS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * Admin ปรับสต็อกอย่างรวดเร็ว
 */
function adminQuickAdjustInventory(itemId, change, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Inventory');
    
    if (!sheet) {
      throw new Error('ไม่พบชีต Inventory');
    }
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    let currentStock = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        foundRow = i + 1;
        currentStock = Number(data[i][4]) || 0;
        break;
      }
    }
    
    if (foundRow === -1) {
      throw new Error(`ไม่พบสินค้า: ${itemId}`);
    }
    
    const newStock = Math.max(0, currentStock + change);
    
    sheet.getRange(foundRow, 5).setValue(newStock);
    sheet.getRange(foundRow, 9).setValue(new Date());
    
    logAction('ADMIN_QUICK_INVENTORY', `Item ${itemId}: ${currentStock} -> ${newStock} (${change})`, adminId);
    
    return { 
      success: true, 
      data: { 
        itemId: itemId,
        oldStock: currentStock,
        newStock: newStock,
        change: change
      } 
    };
    
  } catch (error) {
    logAction('ADMIN_QUICK_INVENTORY_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin อัปเดตสถานะหลายรายการพร้อมกัน (Bulk)
 */
function adminBulkUpdateStatus(orderIds, newStatus, adminId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) throw new Error('ไม่พบชีต Orders');
    
    const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`สถานะไม่ถูกต้อง: ${newStatus}`);
    }
    
    const data = sheet.getDataRange().getValues();
    const results = [];
    
    orderIds.forEach(orderId => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === orderId) {
          const rowNum = i + 1;
          const oldStatus = data[i][6];
          sheet.getRange(rowNum, 7).setValue(newStatus);
          sheet.getRange(rowNum, 10).setValue(new Date());
          results.push({ orderId, success: true, oldStatus });
          break;
        }
      }
    });
    
    logAction('ADMIN_BULK_UPDATE', `Updated ${results.length} orders to ${newStatus}`, adminId);
    
    return { 
      success: true, 
      data: { 
        updated: results.length,
        results: results
      } 
    };
    
  } catch (error) {
    logAction('ADMIN_BULK_UPDATE_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * หา ID เมนูล่าสุด
 */
function getLastMenuId() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) return 'M000';
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    let lastId = 'M000';
    
    for (const row of rows) {
      if (row[0] && row[0].toString().startsWith('M')) {
        if (row[0] > lastId) {
          lastId = row[0];
        }
      }
    }
    
    return lastId;
    
  } catch (error) {
    return 'M000';
  }
}

// ============================================================================
// LINE MESSAGING API FUNCTIONS
// ============================================================================

/**
 * ดึงค่า LINE Configuration
 */
function getLineConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    channelAccessToken: properties.getProperty('LINE_CHANNEL_ACCESS_TOKEN'),
    channelSecret: properties.getProperty('LINE_CHANNEL_SECRET'),
    groupId: properties.getProperty('LINE_GROUP_ID')
  };
}

/**
 * บันทึกการตั้งค่า LINE
 */
function saveLineSettings(payload) {
  try {
    const properties = PropertiesService.getScriptProperties();
    
    properties.setProperty('LINE_CHANNEL_ACCESS_TOKEN', payload.lineToken);
    properties.setProperty('LINE_CHANNEL_SECRET', payload.lineSecret);
    properties.setProperty('LINE_GROUP_ID', payload.lineGroupId);
    
    logAction('LINE_SETTINGS_SAVED', 'LINE settings updated', payload.adminId);
    
    return { success: true };
    
  } catch (error) {
    logAction('LINE_SETTINGS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ตรวจสอบความถูกต้องของ LINE webhook signature
 */
function validateLineSignature(body, signature, channelSecret) {
  if (!channelSecret) return false;
  
  const hash = Utilities.computeHmacSha256Signature(
    Utilities.base64Decode(Utilities.base64Encode(body)), 
    channelSecret
  );
  const computedSignature = Utilities.base64Encode(hash);
  return computedSignature === signature;
}

/**
 * ส่ง Flex Message ไปยัง LINE
 */
function sendLineFlexMessage(orderData) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken || !lineConfig.groupId) {
      Logger.log('LINE not configured');
      return false;
    }
    
    const menuItems = orderData.items.map(item => 
      `${item.quantity}x ${item.menuName}${item.options.length ? ' (' + item.options.join(', ') + ')' : ''}`
    ).join('\n');
    
    // สร้าง Flex Message
    const flexMessage = {
      to: lineConfig.groupId,
      messages: [{
        type: 'flex',
        altText: `🍜 ออเดอร์ใหม่! ${orderData.orderId}`,
        contents: {
          type: 'bubble',
          hero: {
            type: 'image',
            url: 'https://images.unsplash.com/photo-1559310541-2b2f7c3d3b3d?w=1200&h=600&fit=crop',
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover',
            action: {
              type: 'uri',
              uri: 'https://line.me/R/ti/p/@beautynoodle'
            }
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🍜 ออเดอร์ใหม่!',
                weight: 'bold',
                size: 'xl',
                color: '#d97706'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: 'รหัสออเดอร์',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: orderData.orderId,
                        color: '#d97706',
                        size: 'sm',
                        flex: 3,
                        weight: 'bold',
                        wrap: true
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: 'ยอดรวม',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: `฿${orderData.totalPrice}`,
                        color: '#d97706',
                        size: 'sm',
                        flex: 3,
                        weight: 'bold'
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: 'ประเภท',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: orderData.type === 'dine-in' ? 'ทานที่ร้าน' : 'ซื้อกลับ',
                        color: '#666666',
                        size: 'sm',
                        flex: 3
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: 'ชำระเงิน',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: orderData.payment === 'cash' ? 'เงินสด' : 
                               orderData.payment === 'qr-code' ? 'พร้อมเพย์' : 'โอนเงิน',
                        color: '#666666',
                        size: 'sm',
                        flex: 3
                      }
                    ]
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'xxl',
                contents: [
                  {
                    type: 'separator'
                  },
                  {
                    type: 'text',
                    text: '📝 รายการอาหาร',
                    weight: 'bold',
                    size: 'md',
                    margin: 'lg'
                  },
                  {
                    type: 'text',
                    text: menuItems,
                    color: '#666666',
                    size: 'sm',
                    wrap: true
                  }
                ]
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#d97706',
                action: {
                  type: 'uri',
                  label: 'ดูรายละเอียด',
                  uri: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=admin'
                }
              }
            ]
          }
        }
      }]
    };
    
    return sendLineMessage(flexMessage);
    
  } catch (error) {
    logAction('LINE_FLEX_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ส่ง Text Message (Fallback)
 */
function sendLineTextMessage(orderData) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken || !lineConfig.groupId) {
      return false;
    }
    
    const itemsText = orderData.items.map(item => 
      `${item.quantity}x ${item.menuName}${item.options.length ? ' (' + item.options.join(', ') + ')' : ''}`
    ).join('\n');
    
    const message = `🍜 *ออเดอร์ใหม่!*\n` +
      `─────────────────\n` +
      `🆔 รหัส: ${orderData.orderId}\n` +
      `💰 ยอดรวม: ฿${orderData.totalPrice}\n` +
      `🍽️ ประเภท: ${orderData.type === 'dine-in' ? 'ทานที่ร้าน' : 'ซื้อกลับ'}\n` +
      `💳 ชำระ: ${orderData.payment === 'cash' ? 'เงินสด' : orderData.payment === 'qr-code' ? 'พร้อมเพย์' : 'โอนเงิน'}\n` +
      `─────────────────\n` +
      `📋 *รายการอาหาร*\n` +
      `${itemsText}\n` +
      `─────────────────\n` +
      `👉 ดูรายละเอียด: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=admin`;
    
    const payload = {
      to: lineConfig.groupId,
      messages: [{
        type: 'text',
        text: message
      }]
    };
    
    return sendLineMessage(payload);
    
  } catch (error) {
    logAction('LINE_TEXT_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ส่ง Broadcast Message ไปยังทุกคน
 */
function sendLineBroadcast(message, imageUrl, isUrgent = false) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken) return false;
    
    const url = 'https://api.line.me/v2/bot/message/broadcast';
    
    let messages = [];
    
    if (imageUrl) {
      messages.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      });
    }
    
    messages.push({
      type: 'text',
      text: isUrgent ? '🔴 [ด่วน] ' + message : message
    });
    
    const payload = {
      messages: messages
    };
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.channelAccessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('Broadcast sent successfully');
      return true;
    } else {
      Logger.log(`Broadcast failed: ${response.getContentText()}`);
      return false;
    }
    
  } catch (error) {
    logAction('LINE_BROADCAST_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ฟังก์ชันหลักสำหรับส่ง LINE Message
 */
function sendLineMessage(payload) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken) {
      throw new Error('LINE Channel Access Token not configured');
    }
    
    const url = 'https://api.line.me/v2/bot/message/push';
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.channelAccessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('LINE message sent successfully');
      return true;
    } else {
      const responseText = response.getContentText();
      Logger.log(`LINE API error: ${responseCode} - ${responseText}`);
      return false;
    }
    
  } catch (error) {
    logAction('LINE_SEND_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ส่งข้อความแจ้งเตือนสถานะออเดอร์
 */
function sendOrderStatusNotification(orderId, newStatus) {
  try {
    const order = getOrderById(orderId);
    if (!order) return false;
    
    const statusThai = {
      'Pending': '⏳ รอดำเนินการ',
      'Confirmed': '✓ ยืนยันออเดอร์',
      'Preparing': '👨‍🍳 กำลังทำ',
      'Ready': '✅ ทำเสร็จแล้ว',
      'Completed': '🏁 เสร็จสิ้น',
      'Cancelled': '❌ ยกเลิก'
    };
    
    const message = `🔔 *อัปเดตสถานะออเดอร์*\n` +
      `─────────────────\n` +
      `🆔 รหัส: ${orderId}\n` +
      `📌 สถานะ: ${statusThai[newStatus] || newStatus}\n` +
      `💰 ยอดรวม: ฿${order.totalPrice}\n` +
      `─────────────────\n` +
      `ขอบคุณที่ใช้บริการ Beauty Noodle ค่ะ 🙏`;
    
    // ส่งไปยัง LINE Group
    const lineConfig = getLineConfig();
    if (lineConfig.channelAccessToken && lineConfig.groupId) {
      const payload = {
        to: lineConfig.groupId,
        messages: [{
          type: 'text',
          text: message
        }]
      };
      return sendLineMessage(payload);
    }
    
    return false;
    
  } catch (error) {
    logAction('ORDER_STATUS_NOTIFY_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ทดสอบส่ง LINE Message
 */
function sendLineTestMessage() {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken || !lineConfig.groupId) {
      throw new Error('LINE not configured');
    }
    
    const testMessage = {
      to: lineConfig.groupId,
      messages: [{
        type: 'text',
        text: '✅ การเชื่อมต่อ LINE Messaging API สำเร็จ!'
      }]
    };
    
    return sendLineMessage(testMessage);
    
  } catch (error) {
    logAction('LINE_TEST_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * Webhook สำหรับรับข้อความจาก LINE
 */
function handleLineWebhook(webhookData) {
  try {
    const lineConfig = getLineConfig();
    
    // ตรวจสอบ signature (ควรทำใน production)
    // const signature = ... 
    
    // ตอบกลับอัตโนมัติสำหรับข้อความที่ได้รับ
    if (webhookData.events && Array.isArray(webhookData.events)) {
      webhookData.events.forEach(event => {
        if (event.type === 'message' && event.message.type === 'text') {
          const replyToken = event.replyToken;
          const userMessage = event.message.text;
          const userId = event.source.userId;
          
          // สร้าง auto-reply
          let replyMessage = '';
          if (userMessage.includes('สวัสดี') || userMessage.includes('hello')) {
            replyMessage = 'สวัสดีค่ะ ร้าน Beauty Noodle ยินดีต้อนรับค่ะ 🍜';
          } else if (userMessage.includes('เมนู')) {
            replyMessage = 'เมนูของเรามีให้เลือกมากมาย เช่น ก๋วยเตี๋ยวน้ำใส, ต้มยำ, ข้าวต่างๆ กดดูเมนูได้ที่ลิงก์นี้กดดูเมนูได้ที่ลิงก์นี้httpshttpshttpshttpshttpshttps://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
          } else if (userMessage.includes('เวลา') || userMessage.includes('เปิด')) {
            replyMessage = 'ร้านเปิดทุกวัน 08:00 - 20:00 น. ค่ะ';
          } else if (userMessage.includes('เบอร์') || userMessage.includes('โทร')) {
            replyMessage = 'เบอร์โทรศัพท์ร้าน: 081-234-5678 ค่ะ';
          } else {
            replyMessage = 'ขอบคุณที่ติดต่อค่ะ ถ้าต้องการสอบถามเพิ่มเติม โทร 081-234-5678 หรือกดดูเมนูได้ที่เว็บไซต์ค่ะ 🙏';
          }
          
          // ส่งข้อความตอบกลับ
          const replyPayload = {
            replyToken: replyToken,
            messages: [{
              type: 'text',
              text: replyMessage
            }]
          };
          
          const url = 'https://api.line.me/v2/bot/message/reply';
          const options = {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + lineConfig.channelAccessToken
            },
            payload: JSON.stringify(replyPayload),
            muteHttpExceptions: true
          };
          
          UrlFetchApp.fetch(url, options);
          
          // Log user interaction
          logAction('LINE_AUTO_REPLY', `User ${userId}: ${userMessage}`, 'LINE');
        }
      });
    }
    
    return createJSONResponse({ status: 'ok' });
    
  } catch (error) {
    logAction('LINE_WEBHOOK_ERROR', error.message, 'SYSTEM');
    return createJSONResponse({ status: 'error', message: error.message });
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * ตรวจสอบออเดอร์ใหม่ (สำหรับเสียงแจ้งเตือน)
 */
function checkNewOrders(lastCount) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      return { success: false, error: 'Orders sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const pendingOrders = rows.filter(row => row[6] === 'Pending').length;
    const hasNew = pendingOrders > lastCount;
    
    const latestOrders = rows
      .filter(row => row[6] === 'Pending')
      .sort((a, b) => new Date(b[7]) - new Date(a[7]))
      .slice(0, 3)
      .map(row => ({
        orderId: row[0],
        totalPrice: Number(row[3]),
        timestamp: row[7]
      }));
    
    return {
      success: true,
      data: {
        pendingCount: pendingOrders,
        hasNew: hasNew,
        newCount: hasNew ? pendingOrders - lastCount : 0,
        latestOrders: latestOrders
      }
    };
    
  } catch (error) {
    logAction('CHECK_NEW_ORDERS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * ส่งออกออเดอร์เป็น CSV
 */
function exportOrdersAsCSV(params) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      return createJSONResponse({ success: false, error: 'Orders sheet not found' });
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const startDate = params.startDate ? new Date(params.startDate) : null;
    const endDate = params.endDate ? new Date(params.endDate) : null;
    
    // Filter by date if provided
    let filteredRows = rows;
    if (startDate || endDate) {
      filteredRows = rows.filter(row => {
        const orderDate = new Date(row[7]);
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      });
    }
    
    // Process rows for CSV
    const csvRows = filteredRows.map(row => {
      const newRow = [...row];
      // Parse items JSON to readable format
      if (newRow[2]) {
        try {
          const items = JSON.parse(newRow[2]);
          newRow[2] = items.map(i => `${i.menuName} x${i.quantity}${i.options.length ? ' (' + i.options.join(', ') + ')' : ''}`).join('; ');
        } catch (e) {
          newRow[2] = '';
        }
      }
      return newRow;
    });
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    csv += csvRows.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return '';
        const cellStr = String(cell).replace(/"/g, '""');
        return cellStr.includes(',') ? `"${cellStr}"` : cellStr;
      }).join(',')
    ).join('\n');
    
    return ContentService
      .createTextOutput('\uFEFF' + csv) // Add BOM for Thai
      .setMimeType(ContentService.MimeType.CSV)
      .downloadAsFile(`orders_${new Date().toISOString().slice(0,10)}.csv`);
      
  } catch (error) {
    logAction('EXPORT_ERROR', error.message, 'SYSTEM');
    return createJSONResponse({ success: false, error: error.message });
  }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function createJSONResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// LOGGING
// ============================================================================

function logAction(action, details, userId) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('Logs');
    
    if (!sheet) {
      sheet = ss.insertSheet('Logs');
      sheet.getRange('A1:F1').setValues([['timestamp', 'userId', 'action', 'details', 'ip_address', 'user_agent']]);
    }
    
    sheet.appendRow([new Date(), userId || 'SYSTEM', action, details, '', '']);
    
    // Keep only last 10000 logs
    const maxRows = 10000;
    const currentRows = sheet.getLastRow();
    if (currentRows > maxRows) {
      sheet.deleteRows(2, currentRows - maxRows);
    }
    
  } catch (error) {
    console.error('Log failed:', error);
  }
}

// ============================================================================
// TEST FUNCTION
// ============================================================================

function testSystem() {
  Logger.log('='.repeat(50));
  Logger.log('🔍 Testing Beauty Noodle Shop System v8.0.0');
  Logger.log('='.repeat(50));
  
  try {
    Logger.log('\n📁 Testing config...');
    const config = getConfig();
    Logger.log('Config loaded:', config);
    
    Logger.log('\n🍜 Testing getMenu...');
    const menu = getMenuItemsWithDetails();
    Logger.log(`Found ${menu.length} menu items`);
    
    Logger.log('\n📊 Testing spreadsheet connection...');
    const ss = getSpreadsheet();
    Logger.log('Spreadsheet connected:', ss.getName());
    
    Logger.log('\n📈 Testing dashboard stats...');
    const stats = getDashboardStatsData();
    Logger.log('Stats:', stats);
    
    Logger.log('\n📦 Testing inventory...');
    const inventory = getInventoryStatusData();
    Logger.log(`Found ${inventory.data.all.length} inventory items`);
    Logger.log(`Low stock: ${inventory.data.lowStockCount}`);
    
    Logger.log('\n👥 Testing customer stats...');
    const customers = getCustomerStats();
    Logger.log('Customer stats:', customers);
    
    Logger.log('\n🏆 Testing best selling...');
    const bestSelling = getBestSellingItems();
    Logger.log('Best selling:', bestSelling);
    
    Logger.log('\n' + '='.repeat(50));
    Logger.log('✅ Test Completed!');
    Logger.log('='.repeat(50));
    
  } catch (error) {
    Logger.log('❌ Test failed:', error.message);
  }
}

/**
 * ฟังก์ชันสำหรับ Deploy (เรียกเมื่อมีการอัปเดต)
 */
function onDeploy() {
  Logger.log('🚀 Deploying Beauty Noodle Shop System v8.0.0');
  Logger.log('Timestamp: ' + new Date().toISOString());
  
  // Verify database
  try {
    setupDatabase();
    Logger.log('✅ Database verified');
  } catch (e) {
    Logger.log('❌ Database error: ' + e.message);
  }
  
  // Clear cache
  try {
    CacheService.getScriptCache().removeAll();
    Logger.log('✅ Cache cleared');
  } catch (e) {
    Logger.log('❌ Cache error: ' + e.message);
  }
  
  Logger.log('✅ Deploy complete');
}

/**
 * สร้าง Backups อัตโนมัติ (ควรตั้งเวลาให้รันทุกวัน)
 */
function createBackup() {
  try {
    const ss = getSpreadsheet();
    const backupName = `Backup_${new Date().toISOString().slice(0,10)}`;
    
    // Create a copy
    const backupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
    
    // Move to backup folder (create if not exists)
    let backupFolder = DriveApp.getFoldersByName('BeautyNoodleBackups');
    if (!backupFolder.hasNext()) {
      backupFolder = DriveApp.createFolder('BeautyNoodleBackups');
    } else {
      backupFolder = backupFolder.next();
    }
    
    backupFile.moveTo(backupFolder);
    
    // Delete old backups (keep last 30 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    
    const files = backupFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.getDateCreated() < cutoff) {
        file.setTrashed(true);
      }
    }
    
    logAction('BACKUP_CREATED', `Backup created: ${backupName}`, 'SYSTEM');
    
  } catch (error) {
    logAction('BACKUP_ERROR', error.message, 'SYSTEM');
  }
}


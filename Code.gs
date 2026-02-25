/**
 * Beauty Noodle Shop - Backend System (Complete Version with New Features)
 * Google Apps Script Backend for Restaurant Management
 * 
 * @author Senior Backend Developer
 * @version 6.0.0
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
  
  Logger.log('✅ Initial setup completed.');
  Logger.log('Spreadsheet ID: ' + spreadsheetId);
  Logger.log('Admin Token: ' + adminToken);
  Logger.log('API Key: ' + apiKey);
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
// DATABASE SETUP (ปลอดภัย ไม่ลบข้อมูลเดิม)
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
 * สร้างชีต Config (ถ้ายังไม่มี)
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
      ['closeTime', '20:00']
    ];
    
    sheet.getRange(2, 1, configData.length, 2).setValues(configData);
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Config sheet ready');
}

/**
 * สร้างชีต Menu (ถ้ายังไม่มี หรือไม่มีข้อมูล)
 */
function createMenuSheet(ss) {
  let sheet = ss.getSheetByName('Menu');
  
  if (!sheet) {
    sheet = ss.insertSheet('Menu');
    const headers = [['id', 'name', 'category', 'price', 'options_json', 'status', 'image_url', 'description', 'ingredients']];
    sheet.getRange('A1:I1').setValues(headers);
    sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
    
    // เพิ่มข้อมูลตัวอย่างเฉพาะเมื่อเป็นชีตใหม่เท่านั้น
    const sampleData = [
      ['M001', 'ก๋วยเตี๋ยวหมูน้ำใส', 'ก๋วยเตี๋ยว', 45, JSON.stringify([
        {type: 'noodle', name: 'เลือกเส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น', 'บะหมี่']},
        {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ลูกชิ้น +10', 'หมูกรอบ +15', 'ไข่ต้ม +10']}
      ]), 'active', 'https://images.unsplash.com/photo-1559310541-2b2f7c3d3b3d?w=400', 'น้ำซุปใส หอมกลิ่นเครื่องเทศ', 'เส้นเล็ก,หมูสับ,ลูกชิ้น,ผักชี'],
      
      ['M002', 'ก๋วยเตี๋ยวต้มยำหมู', 'ก๋วยเตี๋ยว', 55, JSON.stringify([
        {type: 'noodle', name: 'เลือกเส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น', 'บะหมี่']},
        {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ลูกชิ้น +10', 'หมูกรอบ +15', 'ไข่ต้ม +10']}
      ]), 'active', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', 'ต้มยำน้ำข้น รสจัดจ้าน', 'เส้นเล็ก,หมูสับ,น้ำตก,พริกป่น']
    ];
    
    sheet.getRange(2, 1, sampleData.length, 9).setValues(sampleData);
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Menu sheet ready');
}

/**
 * สร้างชีต Orders (ถ้ายังไม่มี)
 */
function createOrdersSheet(ss) {
  let sheet = ss.getSheetByName('Orders');
  
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    const headers = [['orderId', 'userId', 'items_json', 'totalPrice', 'type', 'payment', 'status', 'timestamp', 'note', 'last_updated']];
    sheet.getRange('A1:J1').setValues(headers);
    sheet.getRange('A1:J1').setFontWeight('bold').setBackground('#fbbc04').setFontColor('#000000');
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Orders sheet ready');
}

/**
 * สร้างชีต Logs (ถ้ายังไม่มี)
 */
function createLogsSheet(ss) {
  let sheet = ss.getSheetByName('Logs');
  
  if (!sheet) {
    sheet = ss.insertSheet('Logs');
    const headers = [['timestamp', 'userId', 'action', 'details', 'ip_address']];
    sheet.getRange('A1:E1').setValues(headers);
    sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Logs sheet ready');
}

/**
 * สร้างชีต Inventory (ถ้ายังไม่มี)
 */
function createInventorySheet(ss) {
  let sheet = ss.getSheetByName('Inventory');
  
  if (!sheet) {
    sheet = ss.insertSheet('Inventory');
    const headers = [['id', 'name', 'category', 'unit', 'currentStock', 'minStock', 'maxStock', 'costPerUnit', 'lastUpdated']];
    sheet.getRange('A1:I1').setValues(headers);
    sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
    
    // ข้อมูลตัวอย่าง
    const sampleData = [
      ['INV001', 'เส้นเล็ก', 'เส้น', 'kg', 15, 5, 50, 25, new Date()],
      ['INV002', 'เส้นใหญ่', 'เส้น', 'kg', 8, 5, 50, 25, new Date()],
      ['INV003', 'หมูสไลด์', 'เนื้อ', 'kg', 6, 3, 30, 120, new Date()],
      ['INV004', 'ลูกชิ้น', 'เนื้อ', 'ลูก', 200, 50, 500, 3, new Date()],
      ['INV005', 'ไข่ไก่', 'ของสด', 'ฟอง', 80, 30, 200, 4, new Date()],
      ['INV006', 'ผักชี', 'ผัก', 'kg', 2, 1, 5, 50, new Date()]
    ];
    
    sheet.getRange(2, 1, sampleData.length, 9).setValues(sampleData);
  }
  
  sheet.setFrozenRows(1);
  Logger.log('✓ Inventory sheet ready');
}

// ============================================================================
// API ENDPOINTS - รองรับทั้ง JSON และ JSONP
// ============================================================================

/**
 * GET API - จัดการทุกคำขอแบบ GET รองรับ JSONP
 */
function doGet(e) {
  try {
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
        if (!verifyApiKey(e.parameter.key)) {
          result = { success: false, error: 'Invalid API Key' };
        } else {
          result = getAllOrdersData(e.parameter);
        }
      } else if (action === 'getDashboardStats') {
        if (!verifyApiKey(e.parameter.key)) {
          result = { success: false, error: 'Invalid API Key' };
        } else {
          result = getDashboardStatsData();
        }
      } else if (action === 'getInventoryStatus') {
        if (!verifyApiKey(e.parameter.key)) {
          result = { success: false, error: 'Invalid API Key' };
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

/**
 * POST API - จัดการทุกคำขอแบบ POST
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const payload = JSON.parse(e.postData.contents);
    
    // LINE Webhook
    if (payload.events && Array.isArray(payload.events)) {
      return handleLineWebhook(payload);
    }
    
    const action = payload.action;
    let result;
    
    try {
      // Customer endpoints
      if (action === 'saveOrder') {
        result = saveOrderData(payload);
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
      } 
      // NEW: Shop Status Toggle
      else if (action === 'adminToggleShopStatus') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminToggleShopStatus(payload.isOpen, payload.adminId);
        }
      }
      // NEW: Menu Management
      else if (action === 'adminAddMenu') {
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
      }
      // NEW: Quick Inventory Adjust
      else if (action === 'adminQuickAdjustInventory') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminQuickAdjustInventory(payload.itemId, payload.change, payload.adminId);
        }
      }
      // NEW: Check New Orders
      else if (action === 'checkNewOrders') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = checkNewOrders(payload.lastCount || 0);
        }
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
        closeTime: config.closeTime || '20:00'
      }
    };
    
  } catch (error) {
    logAction('GET_SHOP_STATUS_ERROR', error.message, 'SYSTEM');
    throw error;
  }
}

function getOrderData(orderId) {
  const order = getOrderById(orderId);
  if (order) {
    return { success: true, data: { order: order } };
  } else {
    return { success: false, error: 'Order not found' };
  }
}

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
      lastUpdated: row[9] || row[7]
    })).filter(order => {
      if (filterStatus && filterStatus !== 'all') {
        return order.status === filterStatus;
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { success: true, data: { orders: orders } };
    
  } catch (error) {
    throw error;
  }
}

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
      status: getStockStatus(Number(row[4]) || 0, Number(row[5]) || 0)
    }));
    
    const lowStock = inventory.filter(item => item.currentStock <= item.minStock);
    
    return { 
      success: true, 
      data: {
        all: inventory,
        lowStock: lowStock,
        lowStockCount: lowStock.length
      }
    };
    
  } catch (error) {
    throw error;
  }
}

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
      timestamp
    ]);
    
    logAction('SAVE_ORDER', `Order ${orderId} created - Total: ${totalPrice}฿`, orderData.userId);
    
    // ส่ง LINE Notification
    try {
      const lineConfig = getLineConfig();
      if (lineConfig.accessToken && lineConfig.groupId) {
        sendLineNotification(orderId, processedItems, totalPrice, orderData.type, orderData.payment);
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * ดึงข้อมูลเมนูแบบละเอียด
 */
function getMenuItemsWithDetails() {
  try {
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
        status: statusIndex !== -1 ? row[statusIndex] : 'active'
      });
    }
    
    return menu;
    
  } catch (error) {
    logAction('GET_MENU_ITEMS_ERROR', error.message, 'SYSTEM');
    return [];
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
 * สร้าง Order ID
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
 * ดึงข้อมูลออเดอร์
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
          note: data[i][8]
        };
      }
    }
    return null;
    
  } catch (error) {
    logAction('GET_ORDER_ERROR', error.message, 'SYSTEM');
    return null;
  }
}

function getStockStatus(current, min) {
  if (current <= 0) return 'out';
  if (current <= min) return 'low';
  if (current <= min * 2) return 'medium';
  return 'high';
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

function adminLogin(username, password) {
  const validUsername = 'admin';
  const validPassword = 'beautynoodle123';
  
  if (username === validUsername && password === validPassword) {
    const token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
    return { success: true, data: { token: token } };
  }
  
  return { success: false, error: 'Invalid credentials' };
}

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
    
    return { success: true, data: { orderId: orderId } };
    
  } catch (error) {
    logAction('ADMIN_UPDATE_STATUS_ERROR', error.message, adminId);
    throw error;
  }
}

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
      new Date()
    ]);
    
    logAction('ADMIN_ADD_INVENTORY', `Added ${itemData.name}`, adminId);
    
    return { success: true, data: { itemId: newId } };
    
  } catch (error) {
    logAction('ADMIN_ADD_INVENTORY_ERROR', error.message, adminId);
    throw error;
  }
}

// ============================================================================
// NEW FEATURES - SHOP MANAGEMENT
// ============================================================================

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

// ============================================================================
// MENU MANAGEMENT
// ============================================================================

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
    
    const newRow = [
      menuData.id,
      menuData.name,
      menuData.category,
      parseFloat(menuData.price) || 0,
      optionsJson,
      menuData.status || 'active',
      menuData.image_url || '',
      menuData.description || '',
      menuData.ingredients || ''
    ];
    
    sheet.appendRow(newRow);
    
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
      ingredients: row[ingredientsIndex] || ''
    }));
    
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
// ENHANCED INVENTORY FUNCTIONS
// ============================================================================

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
// LINE INTEGRATION
// ============================================================================

function sendLineNotification(orderId, items, totalPrice, type, payment) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.accessToken || !lineConfig.groupId) return false;
    
    const itemsText = items.map(item => 
      `${item.quantity}x ${item.menuName}${item.options.length ? ' (' + item.options.join(', ') + ')' : ''}`
    ).join('\n');
    
    const message = `🍜 ออเดอร์ใหม่!\n` +
      `รหัส: ${orderId}\n` +
      `-------------------\n` +
      `${itemsText}\n` +
      `-------------------\n` +
      `รวม: ${totalPrice} ฿\n` +
      `ประเภท: ${type === 'dine-in' ? 'ทานที่ร้าน' : 'ซื้อกลับ'}\n` +
      `ชำระ: ${payment}`;
    
    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      to: lineConfig.groupId,
      messages: [{ type: 'text', text: message }]
    };
    
    UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.accessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    return true;
    
  } catch (error) {
    logAction('LINE_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

function handleLineWebhook(webhookData) {
  return createJSONResponse({ status: 'ok' });
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function createJSONResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      sheet.getRange('A1:E1').setValues([['timestamp', 'userId', 'action', 'details', 'ip_address']]);
    }
    
    sheet.appendRow([new Date(), userId || 'SYSTEM', action, details, '']);
    
  } catch (error) {
    console.error('Log failed:', error);
  }
}

// ============================================================================
// TEST FUNCTION
// ============================================================================

function testSystem() {
  Logger.log('='.repeat(50));
  Logger.log('🔍 Testing Beauty Noodle Shop System');
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
    
    Logger.log('\n' + '='.repeat(50));
    Logger.log('✅ Test Completed!');
    Logger.log('='.repeat(50));
    
  } catch (error) {
    Logger.log('❌ Test failed:', error.message);
  }
}

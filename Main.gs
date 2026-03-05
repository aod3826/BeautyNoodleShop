/**
 * Beauty Noodle Shop - Main.gs
 * ระบบหลัก: ตัวแปร Global, Entry Points, และ Setup
 * @version 8.2.0
 * 
 * หมายเหตุ: ปรับปรุงการรองรับ LINE Messaging API และเพิ่มความปลอดภัย
 */

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

const requestCounts = {};

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * ตรวจสอบ Rate Limit เพื่อป้องกันการใช้งานเกินกำหนด
 * @param {string} userId - ID ผู้ใช้
 * @throws {Error} ถ้าเกิน limit
 */
function checkRateLimit(userId = 'anonymous') {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = userId + '_' + minute;

  requestCounts[key] = (requestCounts[key] || 0) + 1;

  // จำกัดที่ 100 requests ต่อนาที
  if (requestCounts[key] > 100) {
    throw new Error('Too many requests. Please try again later.');
  }

  // ล้างข้อมูลเก่า (เกิน 10 นาที)
  Object.keys(requestCounts).forEach(k => {
    const [_, ts] = k.split('_');
    if (parseInt(ts) < minute - 10) {
      delete requestCounts[k];
    }
  });
}

// ============================================================================
// ENTRY POINTS
// ============================================================================

/**
 * GET API - จัดการทุกคำขอแบบ GET รองรับ JSONP
 * แก้ไขปัญหา favicon.ico และ static file requests
 */
function doGet(e) {
  try {
    const userId = e?.parameter?.userId || 'anonymous';
    checkRateLimit(userId);

    const isJSONP = e && e.parameter && e.parameter.callback;
    const callback = isJSONP ? e.parameter.callback : null;

    // ========== กรณีไม่มี parameter หรือมีแต่ไม่ใช่ action ==========
    // ตรวจสอบว่าไม่มี e.parameter หรือไม่มี action (เช่นเรียก /favicon.ico)
    if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
      // ไม่มี parameter: แสดงหน้า index.html สำหรับลูกค้า
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Beauty Noodle Shop - สั่งอาหารออนไลน์')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1.5')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setFaviconUrl('https://images.unsplash.com/photo-1559310541-2b2f7c3d3b3d?w=32')
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    }

    // ========== กรณีมี action ==========
    const action = e.parameter.action;

    // ตรวจสอบว่าเป็นหน้า Admin หรือไม่
    if (action === 'admin') {
      return HtmlService.createTemplateFromFile('admin')
        .evaluate()
        .setTitle('Beauty Noodle - Admin Dashboard')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1.5')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setFaviconUrl('https://images.unsplash.com/photo-1559310541-2b2f7c3d3b3d?w=32')
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    }

    // ========== กรณีมี action แต่ไม่ใช่หน้าที่ต้องการ ==========
    // ต้องมี action เสมอสำหรับ API calls
    if (!action) {
      // ถ้ามี parameter แต่ไม่มี action ให้ส่งหน้า index.html เช่นกัน
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Beauty Noodle Shop')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    }

    // ========== API Actions ==========
    let result;

    try {
      // ========== PUBLIC ACTIONS (ไม่ต้องใช้ Token) ==========
      if (action === 'getMenuData') {
        result = getMenuData();
      } else if (action === 'getShopStatus') {
        result = getShopStatusData();
      } else if (action === 'getOrderData') {
        result = getOrderData(e.parameter.orderId);
      } else if (action === 'getUserOrdersData') {
        result = getUserOrdersData(e.parameter.userId);
      
      // ========== ADMIN ACTIONS (ต้องใช้ Token) ==========
      } else if (action === 'getDashboardStatsData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getDashboardStatsData();
        }
      } else if (action === 'getAllOrdersData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getAllOrdersData(e.parameter);
        }
      } else if (action === 'getInventoryStatusData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getInventoryStatusData();
        }
      } else if (action === 'adminGetAllMenusData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminGetAllMenus();
        }
      } else if (action === 'checkNewOrdersData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = checkNewOrders(parseInt(e.parameter.lastCount) || 0);
        }
      } else if (action === 'getBestSellingItemsData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getBestSellingItems();
        }
      } else if (action === 'exportOrdersData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          return exportOrdersAsCSV(e.parameter);
        }
      } else if (action === 'getCustomerStatsData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getCustomerStats();
        }
      } else if (action === 'getLineSettingsData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getLineSettingsData();
        }
      } else if (action === 'getConfigData') {
        if (!verifyAdminToken(e.parameter.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = getConfigData();
        }
      } else {
        result = { success: false, error: 'Invalid action' };
      }
    } catch (error) {
      result = { success: false, error: error.message };
    }

    // ========== JSONP Support ==========
    if (isJSONP) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // ========== JSON Response ปกติ ==========
    return createJSONResponse(result);

  } catch (error) {
    logAction('GET_ERROR', error.message, 'SYSTEM');

    // กรณี JSONP Error
    if (e && e.parameter && e.parameter.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + '({"success":false,"error":"' + error.message + '"})')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // กรณี JSON Error ปกติ
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
      // ========== PUBLIC ACTIONS (ไม่ต้องใช้ Token) ==========
      if (action === 'saveOrderData') {
        result = saveOrderData(payload);
      } else if (action === 'updateCustomerData') {
        result = updateCustomerData(payload);
      } else if (action === 'adminLogin') {
        result = adminLogin(payload.username, payload.password);
      
      // ========== ADMIN ACTIONS (ต้องใช้ Token) ==========
      } else if (action === 'adminUpdateOrderStatusData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateOrderStatus(payload.orderId, payload.status, payload.adminId);
        }
      } else if (action === 'adminDeleteOrderData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminDeleteOrder(payload.orderId, payload.adminId);
        }
      } else if (action === 'adminUpdateInventoryData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateInventory(payload.itemId, payload.quantity, payload.adminId);
        }
      } else if (action === 'adminAddInventoryItemData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminAddInventoryItem(payload.itemData, payload.adminId);
        }
      } else if (action === 'adminToggleShopStatusData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminToggleShopStatus(payload.isOpen, payload.adminId);
        }
      } else if (action === 'adminAddMenuData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminAddMenu(payload.menuData, payload.adminId);
        }
      } else if (action === 'adminUpdateMenuData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateMenu(payload.menuData, payload.adminId);
        }
      } else if (action === 'adminQuickAdjustInventoryData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminQuickAdjustInventory(payload.itemId, payload.change, payload.adminId);
        }
      } else if (action === 'adminBulkUpdateStatusData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminBulkUpdateStatus(payload.orderIds, payload.status, payload.adminId);
        }
      } else if (action === 'saveLineSettingsData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = saveLineSettings(payload);
        }
      } else if (action === 'testLineData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          // เรียกใช้ฟังก์ชันทดสอบ LINE Messaging API
          result = { success: sendLineTestMessage() };
        }
      } else if (action === 'lineBroadcastData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = { success: sendLineBroadcast(payload.message, payload.imageUrl, payload.urgent) };
        }
      } else if (action === 'adminUpdateShopNameData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateShopName(payload.shopName, payload.adminId);
        }
      } else if (action === 'adminUpdateConfigData') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = adminUpdateConfig(payload.key, payload.value, payload.adminId);
        }
      } else if (action === 'logErrorData') {
        logAction('CLIENT_ERROR', JSON.stringify(payload.error), payload.userId || 'anonymous');
        result = { success: true };
      
      // ========== CLEAR CACHE ACTION ==========
      } else if (action === 'clearAllCache') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = clearAllCache();
        }
      
      // ========== SYSTEM HEALTH CHECK ==========
      } else if (action === 'systemHealthCheck') {
        if (!verifyAdminToken(payload.token)) {
          result = { success: false, error: 'Unauthorized' };
        } else {
          result = systemHealthCheck();
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
// SETUP FUNCTIONS
// ============================================================================

/**
 * ฟังก์ชันตั้งค่าเริ่มต้น - ให้รันครั้งแรกเพื่อบันทึก Spreadsheet ID
 */
function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ss.getId();

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);

  const adminToken = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', adminToken);

  const apiKey = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('API_KEY', apiKey);

  PropertiesService.getScriptProperties().setProperty('ADMIN_USER', 'admin');
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASS', '123');

  setupDatabase();

  Logger.log('✅ Initial setup completed successfully.');
  Logger.log('Spreadsheet ID: ' + spreadsheetId);
  Logger.log('Admin Token: ' + adminToken);
  Logger.log('API Key: ' + apiKey);
  Logger.log('⚠️ กรุณาเปลี่ยนรหัสผ่าน admin ทันทีหลังจากติดตั้ง!');
  Logger.log('⚠️ กรุณาตั้งค่า LINE Messaging API ในหน้า Settings');
}

/**
 * ฟังก์ชันสำหรับ Deploy (เรียกเมื่อมีการอัปเดต)
 */
function onDeploy() {
  Logger.log('🚀 Deploying Beauty Noodle Shop System v8.2.0');
  Logger.log('Timestamp: ' + new Date().toISOString());

  try {
    setupDatabase();
    Logger.log('✅ Database verified');
  } catch (e) {
    Logger.log('❌ Database error: ' + e.message);
  }

  try {
    CacheService.getScriptCache().removeAll();
    Logger.log('✅ Cache cleared');
  } catch (e) {
    Logger.log('❌ Cache error: ' + e.message);
  }

  Logger.log('✅ Deploy complete');
  Logger.log('📢 หมายเหตุ: LINE Notify ถูกปิดให้บริการแล้ว ใช้ LINE Messaging API แทน');
}

/**
 * Test ระบบทั้งหมด
 */
function testSystem() {
  Logger.log('='.repeat(60));
  Logger.log('🔍 Testing Beauty Noodle Shop System v8.2.0');
  Logger.log('='.repeat(60));

  try {
    Logger.log('\n📁 Testing config...');
    const config = getConfig();
    Logger.log('✅ Config loaded:', config);

    Logger.log('\n🍜 Testing getMenuData...');
    const menu = getMenuItemsWithDetails();
    Logger.log(`✅ Found ${menu.length} menu items`);

    Logger.log('\n📊 Testing spreadsheet connection...');
    const ss = getSpreadsheet();
    Logger.log('✅ Spreadsheet connected:', ss.getName());

    Logger.log('\n📈 Testing dashboard stats...');
    const stats = getDashboardStatsData();
    Logger.log('✅ Stats:', stats);

    Logger.log('\n📦 Testing inventory...');
    const inventory = getInventoryStatusData();
    Logger.log(`✅ Found ${inventory.data.all.length} inventory items`);
    Logger.log(`   Low stock: ${inventory.data.lowStockCount}`);

    Logger.log('\n👥 Testing customer stats...');
    const customers = getCustomerStats();
    Logger.log('✅ Customer stats:', customers);

    Logger.log('\n🏆 Testing best selling...');
    const bestSelling = getBestSellingItems();
    Logger.log('✅ Best selling:', bestSelling);

    Logger.log('\n🔌 Testing LINE Messaging API settings...');
    const lineSettings = getLineSettingsData();
    Logger.log('✅ LINE settings:', lineSettings);

    Logger.log('\n🧹 Testing clear cache...');
    const cacheResult = clearAllCache();
    Logger.log('✅ Clear cache:', cacheResult);

    Logger.log('\n' + '='.repeat(60));
    Logger.log('✅ Test Completed Successfully!');
    Logger.log('='.repeat(60));

  } catch (error) {
    Logger.log('❌ Test failed:', error.message);
    Logger.log('📌 Stack trace:', error.stack);
  }
}

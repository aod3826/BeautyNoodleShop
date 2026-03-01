/**
 * Beauty Noodle Shop - Main.gs
 * ระบบหลัก: ตัวแปร Global, Entry Points, และ Setup
 * @version 8.0.0
 */

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

const requestCounts = {};

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkRateLimit(userId = 'anonymous') {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = userId + '_' + minute;

  requestCounts[key] = (requestCounts[key] || 0) + 1;

  if (requestCounts[key] > 100) {
    throw new Error('Too many requests. Please try again later.');
  }

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
 */
function doGet(e) {
  try {
    const userId = e?.parameter?.userId || 'anonymous';
    checkRateLimit(userId);

    const isJSONP = e && e.parameter && e.parameter.callback;
    const callback = isJSONP ? e.parameter.callback : null;

    if (!e || !e.parameter || !e.parameter.action) {
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Beauty Noodle Shop')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const action = e.parameter.action;

    if (action === 'admin') {
      return HtmlService.createTemplateFromFile('admin')
        .evaluate()
        .setTitle('Beauty Noodle - Admin Dashboard')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

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

    if (isJSONP) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

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
      if (action === 'saveOrder') {
        result = saveOrderData(payload);
      } else if (action === 'updateCustomer') {
        result = updateCustomerData(payload);
      } else if (action === 'adminLogin') {
        result = adminLogin(payload.username, payload.password);
      } else if (action === 'adminUpdateOrderStatus') {
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
}

/**
 * ฟังก์ชันสำหรับ Deploy (เรียกเมื่อมีการอัปเดต)
 */
function onDeploy() {
  Logger.log('🚀 Deploying Beauty Noodle Shop System v8.0.0');
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
}

/**
 * Test ระบบทั้งหมด
 */
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

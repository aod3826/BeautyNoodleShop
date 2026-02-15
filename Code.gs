/**
 * Beauty Noodle Shop - Backend System
 * Google Apps Script Backend for Restaurant Management
 * 
 * @author Senior Backend Developer
 * @version 1.0.0
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
  
  // เก็บ Spreadsheet ID ใน Script Properties (ปลอดภัย ไม่ hard-code)
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
  
  Logger.log('✅ Initial setup completed. Spreadsheet ID saved to Script Properties.');
  Logger.log('Spreadsheet ID: ' + spreadsheetId);
}

/**
 * ดึง Spreadsheet จาก Properties (ปลอดภัย)
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
    
    // สร้างชีต Config
    createConfigSheet(ss);
    
    // สร้างชีต Menu
    createMenuSheet(ss);
    
    // สร้างชีต Orders
    createOrdersSheet(ss);
    
    // สร้างชีต Logs
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
    ['currency', 'THB']
  ];
  
  sheet.getRange(2, 1, configData.length, 2).setValues(configData);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
  
  Logger.log('✓ Config sheet created');
}

/**
 * สร้างชีต Menu
 */
function createMenuSheet(ss) {
  let sheet = ss.getSheetByName('Menu');
  
  if (!sheet) {
    sheet = ss.insertSheet('Menu');
  } else {
    sheet.clear();
  }
  
  // Headers
  const headers = [['id', 'name', 'category', 'price', 'options_json', 'status']];
  sheet.getRange('A1:F1').setValues(headers);
  sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  
  // ข้อมูลตัวอย่าง
  const sampleData = [
    ['M001', 'ก่วยเตี๋ยวหมูน้ำใส', 'ก่วยเตี๋ยว', 45, JSON.stringify([
      {type: 'noodle', name: 'เส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น']},
      {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ไข่ต้ม +10', 'เครื่องใน +15']}
    ]), 'active'],
    ['M002', 'ก่วยเตี๋ยวหมูน้ำตก', 'ก่วยเตี๋ยว', 50, JSON.stringify([
      {type: 'noodle', name: 'เส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่', 'วุ้นเส้น']},
      {type: 'addon', name: 'เพิ่มเติม', choices: ['เนื้อพิเศษ +20', 'ไข่ต้ม +10']}
    ]), 'active'],
    ['M003', 'ก่วยเตี๋ยวไก่', 'ก่วยเตี๋ยว', 45, JSON.stringify([
      {type: 'noodle', name: 'เส้น', choices: ['เส้นเล็ก', 'เส้นใหญ่', 'เส้นหมี่']}
    ]), 'active'],
    ['M004', 'น้ำเปล่า', 'เครื่องดื่ม', 10, '[]', 'active'],
    ['M005', 'น้ำอัดลม', 'เครื่องดื่ม', 15, '[]', 'active']
  ];
  
  sheet.getRange(2, 1, sampleData.length, 6).setValues(sampleData);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 6);
  
  Logger.log('✓ Menu sheet created');
}

/**
 * สร้างชีต Orders
 */
function createOrdersSheet(ss) {
  let sheet = ss.getSheetByName('Orders');
  
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
  } else {
    sheet.clear();
  }
  
  // Headers
  const headers = [['orderId', 'userId', 'items_json', 'totalPrice', 'type', 'payment', 'status', 'timestamp']];
  sheet.getRange('A1:H1').setValues(headers);
  sheet.getRange('A1:H1').setFontWeight('bold').setBackground('#fbbc04').setFontColor('#000000');
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 8);
  
  Logger.log('✓ Orders sheet created');
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
  const headers = [['timestamp', 'userId', 'action', 'details']];
  sheet.getRange('A1:D1').setValues(headers);
  sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 4);
  
  Logger.log('✓ Logs sheet created');
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET API - ดึงข้อมูลเมนูและสถานะร้านค้า
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getMenu';
    
    switch (action) {
      case 'getMenu':
        return getMenuAPI();
      
      case 'getShopStatus':
        return getShopStatusAPI();
      
      case 'getOrder':
        const orderId = e.parameter.orderId;
        return getOrderAPI(orderId);
      
      default:
        return createResponse(false, 'Invalid action', null, 400);
    }
    
  } catch (error) {
    logAction('SYSTEM', 'GET_ERROR', error.message);
    return createResponse(false, 'Server error: ' + error.message, null, 500);
  }
}

/**
 * POST API - รับ JSON Payload
 */
function doPost(e) {
  // ใช้ Lock เพื่อป้องกันการเขียนทับกัน
  const lock = LockService.getScriptLock();
  
  try {
    // รอ Lock สูงสุด 30 วินาที
    lock.waitLock(30000);
    
    // Parse JSON payload
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    switch (action) {
      case 'saveOrder':
        return saveOrderAPI(payload);
      
      case 'updateStatus':
        return updateStatusAPI(payload);
      
      case 'updateConfig':
        return updateConfigAPI(payload);
      
      default:
        return createResponse(false, 'Invalid action', null, 400);
    }
    
  } catch (error) {
    logAction('SYSTEM', 'POST_ERROR', error.message);
    return createResponse(false, 'Server error: ' + error.message, null, 500);
    
  } finally {
    // ปลดล็อคเสมอ
    lock.releaseLock();
  }
}

// ============================================================================
// API FUNCTIONS - GET
// ============================================================================

/**
 * ดึงข้อมูลเมนูทั้งหมด
 */
function getMenuAPI() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    
    if (!sheet) {
      return createResponse(false, 'Menu sheet not found', null, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const menu = rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        if (header === 'options_json') {
          try {
            item.options = JSON.parse(row[index] || '[]');
          } catch {
            item.options = [];
          }
        } else if (header === 'price') {
          item[header] = Number(row[index]);
        } else {
          item[header] = row[index];
        }
      });
      return item;
    }).filter(item => item.status === 'active'); // เอาแค่รายการที่เปิดขาย
    
    logAction('SYSTEM', 'GET_MENU', `Returned ${menu.length} items`);
    
    return createResponse(true, 'Menu retrieved successfully', { menu: menu });
    
  } catch (error) {
    return createResponse(false, 'Error retrieving menu: ' + error.message, null, 500);
  }
}

/**
 * ดึงสถานะร้านค้า
 */
function getShopStatusAPI() {
  try {
    const config = getConfig();
    
    const shopStatus = {
      shopName: config.shopName || 'Beauty Noodle Shop',
      isOpen: config.isOpen === 'true',
      liffId: config.liffId || '',
      currency: config.currency || 'THB'
    };
    
    logAction('SYSTEM', 'GET_SHOP_STATUS', 'Status retrieved');
    
    return createResponse(true, 'Shop status retrieved', shopStatus);
    
  } catch (error) {
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
    
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    const data = sheet.getDataRange().getValues();
    
    // หา order
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        const order = {
          orderId: data[i][0],
          userId: data[i][1],
          items: JSON.parse(data[i][2] || '[]'),
          totalPrice: Number(data[i][3]),
          type: data[i][4],
          payment: data[i][5],
          status: data[i][6],
          timestamp: data[i][7]
        };
        
        return createResponse(true, 'Order found', { order: order });
      }
    }
    
    return createResponse(false, 'Order not found', null, 404);
    
  } catch (error) {
    return createResponse(false, 'Error retrieving order: ' + error.message, null, 500);
  }
}

// ============================================================================
// API FUNCTIONS - POST
// ============================================================================

/**
 * บันทึกออเดอร์ใหม่
 */
function saveOrderAPI(payload) {
  try {
    const { userId, items, type, payment } = payload;
    
    // Validation
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return createResponse(false, 'Invalid order data', null, 400);
    }
    
    if (!type || !payment) {
      return createResponse(false, 'Order type and payment method are required', null, 400);
    }
    
    // คำนวณราคาจากหลังบ้าน (ตรวจสอบความถูกต้อง)
    const calculatedPrice = calculateOrderPrice(items);
    
    if (calculatedPrice === null) {
      return createResponse(false, 'Invalid menu items in order', null, 400);
    }
    
    // สร้าง Order ID
    const orderId = generateOrderId();
    
    // บันทึกลง Orders sheet
    const orderData = {
      orderId: orderId,
      userId: userId,
      items: items,
      totalPrice: calculatedPrice,
      type: type,
      payment: payment,
      status: 'pending',
      timestamp: new Date()
    };
    
    const saved = saveOrder(orderData);
    
    if (saved) {
      logAction(userId, 'CREATE_ORDER', `Order ${orderId} created, Total: ${calculatedPrice} THB`);
      
      return createResponse(true, 'Order saved successfully', {
        orderId: orderId,
        totalPrice: calculatedPrice,
        status: 'pending'
      });
    } else {
      return createResponse(false, 'Failed to save order', null, 500);
    }
    
  } catch (error) {
    return createResponse(false, 'Error saving order: ' + error.message, null, 500);
  }
}

/**
 * อัพเดทสถานะออเดอร์
 */
function updateStatusAPI(payload) {
  try {
    const { orderId, status, userId } = payload;
    
    // Validation
    if (!orderId || !status) {
      return createResponse(false, 'Order ID and status are required', null, 400);
    }
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return createResponse(false, 'Invalid status', null, 400);
    }
    
    // อัพเดทสถานะ
    const updated = updateOrderStatus(orderId, status);
    
    if (updated) {
      logAction(userId || 'ADMIN', 'UPDATE_STATUS', `Order ${orderId} -> ${status}`);
      
      return createResponse(true, 'Order status updated', {
        orderId: orderId,
        newStatus: status
      });
    } else {
      return createResponse(false, 'Order not found or update failed', null, 404);
    }
    
  } catch (error) {
    return createResponse(false, 'Error updating status: ' + error.message, null, 500);
  }
}

/**
 * อัพเดท Config
 */
function updateConfigAPI(payload) {
  try {
    const { key, value, adminToken } = payload;
    
    // Security check (ควรมี admin token)
    // if (adminToken !== 'YOUR_ADMIN_SECRET') {
    //   return createResponse(false, 'Unauthorized', null, 401);
    // }
    
    if (!key || value === undefined) {
      return createResponse(false, 'Key and value are required', null, 400);
    }
    
    const updated = updateConfig(key, value);
    
    if (updated) {
      logAction('ADMIN', 'UPDATE_CONFIG', `${key} = ${value}`);
      return createResponse(true, 'Config updated', { key: key, value: value });
    } else {
      return createResponse(false, 'Failed to update config', null, 500);
    }
    
  } catch (error) {
    return createResponse(false, 'Error updating config: ' + error.message, null, 500);
  }
}

// ============================================================================
// BUSINESS LOGIC
// ============================================================================

/**
 * คำนวณราคาออเดอร์จากเมนู (ตรวจสอบความถูกต้อง)
 */
function calculateOrderPrice(items) {
  try {
    const menuItems = getMenuItems();
    let totalPrice = 0;
    
    for (const item of items) {
      const menuItem = menuItems.find(m => m.id === item.menuId);
      
      if (!menuItem) {
        Logger.log('Invalid menu item: ' + item.menuId);
        return null;
      }
      
      let itemPrice = menuItem.price * (item.quantity || 1);
      
      // คำนวณราคา addon
      if (item.selectedOptions && Array.isArray(item.selectedOptions)) {
        for (const option of item.selectedOptions) {
          const match = option.match(/\+(\d+)/);
          if (match) {
            itemPrice += Number(match[1]) * (item.quantity || 1);
          }
        }
      }
      
      totalPrice += itemPrice;
    }
    
    return totalPrice;
    
  } catch (error) {
    Logger.log('Error calculating price: ' + error.message);
    return null;
  }
}

/**
 * ดึงรายการเมนูทั้งหมด
 */
function getMenuItems() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Menu');
  const data = sheet.getDataRange().getValues();
  
  const menu = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === 'active') { // status column
      menu.push({
        id: data[i][0],
        name: data[i][1],
        category: data[i][2],
        price: Number(data[i][3]),
        status: data[i][5]
      });
    }
  }
  
  return menu;
}

/**
 * บันทึกออเดอร์ลง Sheet
 */
function saveOrder(orderData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    const rowData = [
      orderData.orderId,
      orderData.userId,
      JSON.stringify(orderData.items),
      orderData.totalPrice,
      orderData.type,
      orderData.payment,
      orderData.status,
      orderData.timestamp
    ];
    
    sheet.appendRow(rowData);
    
    return true;
    
  } catch (error) {
    Logger.log('Error saving order: ' + error.message);
    return false;
  }
}

/**
 * อัพเดทสถานะออเดอร์
 */
function updateOrderStatus(orderId, newStatus) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        sheet.getRange(i + 1, 7).setValue(newStatus); // status column
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Error updating status: ' + error.message);
    return false;
  }
}

/**
 * สร้าง Order ID แบบ unique
 */
function generateOrderId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${timestamp}${random}`;
}

// ============================================================================
// CONFIG FUNCTIONS
// ============================================================================

/**
 * ดึงค่า Config ทั้งหมด
 */
function getConfig() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Config');
  const data = sheet.getDataRange().getValues();
  
  const config = {};
  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }
  
  return config;
}

/**
 * อัพเดทค่า Config
 */
function updateConfig(key, value) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        return true;
      }
    }
    
    // ถ้าไม่เจอ key ให้เพิ่มใหม่
    sheet.appendRow([key, value]);
    return true;
    
  } catch (error) {
    Logger.log('Error updating config: ' + error.message);
    return false;
  }
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * บันทึก Log
 */
function logAction(userId, action, details) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Logs');
    
    sheet.appendRow([
      new Date(),
      userId,
      action,
      details
    ]);
    
  } catch (error) {
    Logger.log('Error logging action: ' + error.message);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * สร้าง JSON Response
 */
function createResponse(success, message, data, statusCode) {
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
 * Test function - ทดสอบระบบ
 */
function testSystem() {
  Logger.log('=== Testing Beauty Noodle Shop Backend ===');
  
  // 1. Test setup
  Logger.log('\n1. Testing database setup...');
  const setupResult = setupDatabase();
  Logger.log(setupResult);
  
  // 2. Test get menu
  Logger.log('\n2. Testing getMenu...');
  const menuResult = getMenuAPI();
  Logger.log(menuResult.getContent());
  
  // 3. Test save order
  Logger.log('\n3. Testing saveOrder...');
  const testOrder = {
    action: 'saveOrder',
    userId: 'U1234567890',
    items: [
      { menuId: 'M001', quantity: 2, selectedOptions: ['เส้นเล็ก', 'เนื้อพิเศษ +20'] },
      { menuId: 'M004', quantity: 1, selectedOptions: [] }
    ],
    type: 'dine-in',
    payment: 'cash'
  };
  const saveResult = saveOrderAPI(testOrder);
  Logger.log(saveResult.getContent());
  
  Logger.log('\n=== Test completed ===');
}

/**
 * Beauty Noodle Shop - Database.gs
 * จัดการ Spreadsheet ทั้งหมด: Setup, CRUD, Menu, Inventory
 * @version 8.2.0
 */

// ============================================================================
// SPREADSHEET CONNECTION
// ============================================================================

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
    return { success: true, message: 'Database initialized successfully' };

  } catch (error) {
    Logger.log('❌ Error in setupDatabase: ' + error.message);
    return { success: false, message: error.message };
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
      ['liffId', '2009141036-G9K9jtUn'],
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
// CONFIG & MENU READ
// ============================================================================

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
 * ดึงข้อมูลเมนูแบบละเอียด (พร้อม cache)
 */
function getMenuItemsWithDetails() {
  try {
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
        if (row[0] > lastId) lastId = row[0];
      }
    }

    return lastId;

  } catch (error) {
    return 'M000';
  }
}

// ============================================================================
// DATA READ FUNCTIONS (API Layer)
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
        liffId: config.liffId || '2009141036-G9K9jtUn',
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

    if (!sheet) throw new Error('Orders sheet not found');

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
 * อัปเดตข้อมูลลูกค้า
 */
function updateCustomerData(customerData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Customers');

    if (!sheet) createCustomersSheet(ss);

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
      sheet.appendRow([
        customerData.userId,
        customerData.name || '',
        customerData.phone || '',
        customerData.email || '',
        0, 0,
        new Date(), new Date(),
        customerData.notes || ''
      ]);
    } else {
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
    logAction('INVENTORY_UPDATE', 'Order inventory update triggered', 'SYSTEM');
    return true;
  } catch (error) {
    logAction('INVENTORY_UPDATE_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

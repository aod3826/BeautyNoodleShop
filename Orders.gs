/**
 * Beauty Noodle Shop - Orders.gs
 * จัดการออเดอร์, Dashboard Stats, ลูกค้า, Export
 * @version 8.2.0
 * 
 * หมายเหตุ: ปรับปรุงการส่ง LINE Notification จาก LINE Notify 
 *          มาใช้ LINE Messaging API ตามที่ LineAPI.gs จัดการ
 */

// ============================================================================
// ORDER HELPERS
// ============================================================================

/**
 * สร้าง Order ID รูปแบบ BN{YYMMDDHHMMSS}{random}
 * @returns {string} รหัสออเดอร์
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

// ============================================================================
// SAVE ORDER (แก้ไขส่วน LINE Notification)
// ============================================================================

/**
 * บันทึกข้อมูลออเดอร์ใหม่
 * @param {Object} orderData - ข้อมูลออเดอร์จากหน้า index.html
 * @returns {Object} ผลการบันทึก { success, data }
 */
function saveOrderData(orderData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');

    if (!sheet) throw new Error('ไม่พบชีต Orders');

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!orderData.userId || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('ข้อมูลออเดอร์ไม่ถูกต้อง');
    }

    // ดึงข้อมูลเมนูเพื่อคำนวณราคา
    const menuItems = getMenuItemsWithDetails();
    let totalPrice = 0;
    const processedItems = [];

    // ประมวลผลรายการอาหารแต่ละรายการ
    for (const item of orderData.items) {
      const menuItem = menuItems.find(m => m.id === item.menuId);
      if (!menuItem) throw new Error(`ไม่พบเมนู ID: ${item.menuId}`);

      let itemPrice = menuItem.price;
      let optionsPrice = 0;
      
      // คำนวณราคาจากตัวเลือก (เช่น +20 สำหรับพิเศษ)
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

    // บันทึกลง Spreadsheet
    sheet.appendRow([
      orderId,
      orderData.userId || 'Guest',
      JSON.stringify(processedItems, null, 2),
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

    // อัปเดตสต็อก (ลดจำนวนวัตถุดิบ)
    updateInventoryFromOrder(processedItems);

    // บันทึก Log
    logAction('SAVE_ORDER', `Order ${orderId} created - Total: ${totalPrice}฿`, orderData.userId);

    // ========== ส่ง LINE Messaging API Notification ==========
    try {
      // ตรวจสอบว่า LINE พร้อมใช้งานหรือไม่ (ผ่านฟังก์ชันจาก LineAPI.gs)
      if (typeof isLineMessagingReady === 'function' && isLineMessagingReady()) {
        
        // พยายามส่ง Flex Message ก่อน (สวยงาม)
        const flexSuccess = sendLineFlexMessage({
          orderId: orderId,
          items: processedItems,
          totalPrice: totalPrice,
          type: orderData.type,
          payment: orderData.payment,
          note: orderData.note
        });

        // ถ้า Flex Message ไม่สำเร็จ ให้ส่งเป็น Text Message ทดแทน
        if (!flexSuccess) {
          sendLineTextMessage({
            orderId: orderId,
            items: processedItems,
            totalPrice: totalPrice,
            type: orderData.type,
            payment: orderData.payment
          });
        }
        
        logAction('LINE_MESSAGE_SENT', `LINE notification sent for order ${orderId}`, 'SYSTEM');
      } else {
        // LINE ยังไม่ได้ตั้งค่า
        logAction('LINE_NOT_CONFIGURED', 'LINE Messaging API not fully configured', 'SYSTEM');
      }
      
    } catch (lineError) {
      // ไม่ให้กระทบการบันทึกออเดอร์หลัก
      logAction('LINE_MESSAGE_ERROR', `LINE failed: ${lineError.message}`, 'SYSTEM');
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
    // ส่ง error กลับไปให้ frontend จัดการ
    return { 
      success: false, 
      error: error.message,
      details: 'ไม่สามารถบันทึกออเดอร์ได้ กรุณาลองอีกครั้ง'
    };
  }
}

// ============================================================================
// ADMIN ORDER MANAGEMENT
// ============================================================================

/**
 * Admin อัปเดตสถานะออเดอร์ (เพิ่มการแจ้งเตือน LINE)
 * @param {string} orderId - รหัสออเดอร์
 * @param {string} newStatus - สถานะใหม่
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการอัปเดต
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

    // อัปเดตสถานะ
    sheet.getRange(foundRow, 7).setValue(newStatus);
    sheet.getRange(foundRow, 10).setValue(new Date());

    logAction('ADMIN_UPDATE_STATUS', `Order ${orderId}: ${oldStatus} -> ${newStatus}`, adminId);

    // ========== ส่ง LINE Notification เมื่อสถานะเปลี่ยน ==========
    try {
      if (typeof isLineMessagingReady === 'function' && isLineMessagingReady()) {
        sendOrderStatusNotification(orderId, newStatus);
      }
    } catch (lineError) {
      logAction('LINE_STATUS_ERROR', lineError.message, 'SYSTEM');
    }

    return { success: true, data: { orderId: orderId } };

  } catch (error) {
    logAction('ADMIN_UPDATE_STATUS_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin ลบออเดอร์
 * @param {string} orderId - รหัสออเดอร์
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการลบ
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
    return { success: false, error: error.message };
  }
}

/**
 * Admin อัปเดตสถานะหลายรายการพร้อมกัน (Bulk)
 * @param {Array} orderIds - รายการรหัสออเดอร์
 * @param {string} newStatus - สถานะใหม่
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการอัปเดต
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

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * ดึงข้อมูลสถิติสำหรับ dashboard
 * @returns {Object} สถิติต่างๆ { todayOrders, todayRevenue, pendingOrders, etc. }
 */
function getDashboardStatsData() {
  try {
    const ss = getSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');
    const inventorySheet = ss.getSheetByName('Inventory');

    if (!ordersSheet) throw new Error('Orders sheet not found');

    const ordersData = ordersSheet.getDataRange().getValues();
    const ordersRows = ordersData.slice(1);

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
      averageOrderValue: 0,
      lowStockCount: 0
    };

    // คำนวณจากออเดอร์
    ordersRows.forEach(row => {
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

    // คำนวณสินค้าใกล้หมด
    if (inventorySheet) {
      const invData = inventorySheet.getDataRange().getValues();
      const invRows = invData.slice(1);
      
      stats.lowStockCount = invRows.filter(row => {
        const current = Number(row[4]) || 0;
        const min = Number(row[5]) || 0;
        return current <= min && current > 0;
      }).length;
    }

    return { success: true, data: stats };

  } catch (error) {
    logAction('DASHBOARD_STATS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูลเมนูขายดี
 * @returns {Object} รายการเมนูขายดี
 */
function getBestSellingItems() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');

    if (!sheet) return { success: true, data: { all: [] } };

    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    const itemCounts = {};
    const itemRevenue = {};

    rows.forEach(row => {
      // ป้องกัน JSON.parse error
      let items = [];
      try {
        items = typeof row[2] === 'string' ? JSON.parse(row[2] || '[]') : (row[2] || []);
      } catch (e) {
        items = [];
      }
      
      items.forEach(item => {
        const key = item.menuId + '|' + (item.menuName || 'ไม่ระบุ');
        itemCounts[key] = (itemCounts[key] || 0) + (item.quantity || 1);
        itemRevenue[key] = (itemRevenue[key] || 0) + (item.totalPrice || 0);
      });
    });

    const bestSelling = Object.entries(itemCounts)
      .map(([key, quantity]) => {
        const [id, name] = key.split('|');
        return { id, name, quantity, revenue: itemRevenue[key] || 0 };
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
 * ตรวจสอบออเดอร์ใหม่ (สำหรับเสียงแจ้งเตือน)
 * @param {number} lastCount - จำนวนออเดอร์รอล่าสุด
 * @returns {Object} ข้อมูลออเดอร์ใหม่
 */
function checkNewOrders(lastCount) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Orders');

    if (!sheet) return { success: false, error: 'Orders sheet not found' };

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
// ADMIN CONFIG MANAGEMENT
// ============================================================================

/**
 * Admin อัปเดตชื่อร้าน
 * @param {string} shopName - ชื่อร้านใหม่
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการอัปเดต
 */
function adminUpdateShopName(shopName, adminId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');

    if (!sheet) throw new Error('ไม่พบชีต Config');

    const data = sheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'shopName') {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow === -1) {
      sheet.appendRow(['shopName', shopName]);
    } else {
      sheet.getRange(foundRow, 2).setValue(shopName);
    }

    logAction('ADMIN_UPDATE_SHOP_NAME', `Shop name changed to: ${shopName}`, adminId);
    return { success: true };

  } catch (error) {
    logAction('ADMIN_UPDATE_SHOP_NAME_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin อัปเดตค่า Config ทั่วไป
 * @param {string} key - คีย์ที่ต้องการอัปเดต
 * @param {string} value - ค่าใหม่
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการอัปเดต
 */
function adminUpdateConfig(key, value, adminId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');

    if (!sheet) throw new Error('ไม่พบชีต Config');

    const data = sheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow === -1) {
      sheet.appendRow([key, value]);
    } else {
      sheet.getRange(foundRow, 2).setValue(value);
    }

    logAction('ADMIN_UPDATE_CONFIG', `Config ${key} changed`, adminId);
    return { success: true };

  } catch (error) {
    logAction('ADMIN_UPDATE_CONFIG_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูล Config ทั้งหมด (สำหรับ Admin)
 * @returns {Object} ข้อมูล Config (ไม่รวมข้อมูลสำคัญ)
 */
function getConfigData() {
  try {
    const config = getConfig();
    
    // ซ่อนข้อมูลที่สำคัญ
    const safeConfig = { ...config };
    delete safeConfig.adminPassword;
    delete safeConfig.apiKey;
    delete safeConfig.LINE_CHANNEL_ACCESS_TOKEN;
    delete safeConfig.LINE_CHANNEL_SECRET;
    
    return {
      success: true,
      data: safeConfig
    };
  } catch (error) {
    logAction('GET_CONFIG_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// ADMIN MENU MANAGEMENT
// ============================================================================

/**
 * Admin เปิด/ปิดร้าน
 * @param {string|boolean} isOpen - สถานะเปิด/ปิด
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการอัปเดต
 */
function adminToggleShopStatus(isOpen, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Config');

    if (!sheet) throw new Error('ไม่พบชีต Config');

    const data = sheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'isOpen') {
        foundRow = i + 1;
        break;
      }
    }

    const boolValue = (isOpen === 'true' || isOpen === true) ? 'true' : 'false';

    if (foundRow === -1) {
      sheet.appendRow(['isOpen', boolValue]);
    } else {
      sheet.getRange(foundRow, 2).setValue(boolValue);
    }

    logAction('ADMIN_TOGGLE_SHOP', `Shop status changed to: ${boolValue}`, adminId);

    return {
      success: true,
      data: { isOpen: boolValue === 'true' }
    };

  } catch (error) {
    logAction('ADMIN_TOGGLE_SHOP_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin เพิ่มเมนูใหม่
 * @param {Object} menuData - ข้อมูลเมนู
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการเพิ่ม
 */
function adminAddMenu(menuData, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');

    if (!sheet) throw new Error('ไม่พบชีต Menu');

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

    sheet.appendRow([
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
    ]);

    // Clear cache
    CacheService.getScriptCache().remove('menu_items');

    logAction('ADMIN_ADD_MENU', `Added menu: ${menuData.name} (${menuData.id})`, adminId);

    return {
      success: true,
      data: { id: menuData.id, name: menuData.name }
    };

  } catch (error) {
    logAction('ADMIN_ADD_MENU_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin อัปเดตเมนู
 * @param {Object} menuData - ข้อมูลเมนู
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการอัปเดต
 */
function adminUpdateMenu(menuData, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');

    if (!sheet) throw new Error('ไม่พบชีต Menu');
    if (!menuData.id) throw new Error('กรุณาระบุ ID เมนู');

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

    if (foundRow === -1) throw new Error(`ไม่พบเมนู ID: ${menuData.id}`);

    if (menuData.name !== undefined) sheet.getRange(foundRow, nameIndex + 1).setValue(menuData.name);
    if (menuData.category !== undefined) sheet.getRange(foundRow, categoryIndex + 1).setValue(menuData.category);
    if (menuData.price !== undefined) sheet.getRange(foundRow, priceIndex + 1).setValue(parseFloat(menuData.price) || 0);
    if (menuData.options_json !== undefined) sheet.getRange(foundRow, optionsIndex + 1).setValue(menuData.options_json);
    if (menuData.status !== undefined) sheet.getRange(foundRow, statusIndex + 1).setValue(menuData.status);
    if (menuData.image_url !== undefined) sheet.getRange(foundRow, imageIndex + 1).setValue(menuData.image_url);
    if (menuData.description !== undefined) sheet.getRange(foundRow, descIndex + 1).setValue(menuData.description);
    if (menuData.ingredients !== undefined) sheet.getRange(foundRow, ingredientsIndex + 1).setValue(menuData.ingredients);
    if (menuData.sortOrder !== undefined) sheet.getRange(foundRow, sortOrderIndex + 1).setValue(menuData.sortOrder);
    if (updatedAtIndex !== -1) sheet.getRange(foundRow, updatedAtIndex + 1).setValue(new Date());

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
 * @returns {Object} รายการเมนู
 */
function adminGetAllMenus() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Menu');

    if (!sheet) return { success: true, data: { menu: [] } };

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
      data: { menu: menu, total: menu.length }
    };

  } catch (error) {
    logAction('ADMIN_GET_MENUS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CUSTOMER STATS
// ============================================================================

/**
 * ดึงข้อมูลลูกค้า
 * @returns {Object} สถิติลูกค้า
 */
function getCustomerStats() {
  try {
    const ss = getSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');
    const customersSheet = ss.getSheetByName('Customers');

    if (!ordersSheet) {
      return { success: true, data: { total: 0, new: 0, returning: 0, customers: [] } };
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

    // อัปเดตชีต Customers
    if (customersSheet) {
      // ล้างข้อมูลเก่า
      if (customersSheet.getLastRow() > 1) {
        customersSheet.getRange(2, 1, customersSheet.getLastRow() - 1, 9).clear();
      }
      
      const customerRows = customers.map(c => [
        c.userId, '', '', '',
        c.totalSpent, c.orderCount,
        c.lastOrder, c.firstOrder, ''
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
          : 0,
        customers: customers.slice(0, 50)
      }
    };

  } catch (error) {
    logAction('CUSTOMER_STATS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * ส่งออกออเดอร์เป็น CSV
 * @param {Object} params - พารามิเตอร์ { startDate, endDate }
 * @returns {Object} CSV file
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

    let filteredRows = rows;
    if (startDate || endDate) {
      filteredRows = rows.filter(row => {
        const orderDate = new Date(row[7]);
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      });
    }

    const csvRows = filteredRows.map(row => {
      const newRow = [...row];
      if (newRow[2]) {
        try {
          const items = JSON.parse(newRow[2]);
          newRow[2] = items.map(i =>
            `${i.menuName} x${i.quantity}${i.options.length ? ' (' + i.options.join(', ') + ')' : ''}`
          ).join('; ');
        } catch (e) {
          newRow[2] = '';
        }
      }
      return newRow;
    });

    let csv = headers.join(',') + '\n';
    csv += csvRows.map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return '';
        const cellStr = String(cell).replace(/"/g, '""');
        return cellStr.includes(',') ? `"${cellStr}"` : cellStr;
      }).join(',')
    ).join('\n');

    return ContentService
      .createTextOutput('\uFEFF' + csv)
      .setMimeType(ContentService.MimeType.CSV)
      .downloadAsFile(`orders_${new Date().toISOString().slice(0, 10)}.csv`);

  } catch (error) {
    logAction('EXPORT_ERROR', error.message, 'SYSTEM');
    return createJSONResponse({ success: false, error: error.message });
  }
}

// ============================================================================
// INVENTORY UPDATE
// ============================================================================

/**
 * อัปเดตสต็อกจากออเดอร์ (ต้อง implement จริงตามความเหมาะสม)
 * @param {Array} items - รายการอาหารในออเดอร์
 * @returns {boolean} true ถ้าอัปเดตสำเร็จ
 */
function updateInventoryFromOrder(items) {
  try {
    logAction('INVENTORY_UPDATE', `Processing ${items.length} items for inventory update`, 'SYSTEM');
    // TODO: implement actual inventory deduction logic
    // ตัวอย่าง: ลดจำนวนวัตถุดิบตามรายการอาหาร
    return true;
  } catch (error) {
    logAction('INVENTORY_UPDATE_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

// ============================================================================
// ADMIN INVENTORY MANAGEMENT
// ============================================================================

/**
 * Admin อัปเดตสต็อก
 * @param {string} itemId - ID สินค้า
 * @param {number} newQuantity - จำนวนใหม่
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการอัปเดต
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
    return { success: false, error: error.message };
  }
}

/**
 * Admin เพิ่มสินค้าใหม่
 * @param {Object} itemData - ข้อมูลสินค้า
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการเพิ่ม
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
      itemData.category || 'ทั่วไป',
      itemData.unit || 'ชิ้น',
      itemData.currentStock || 0,
      itemData.minStock || 5,
      itemData.maxStock || 50,
      itemData.costPerUnit || 0,
      new Date(),
      itemData.supplier || '',
      itemData.location || ''
    ]);

    logAction('ADMIN_ADD_INVENTORY', `Added ${itemData.name} (${newId})`, adminId);

    return { success: true, data: { itemId: newId } };

  } catch (error) {
    logAction('ADMIN_ADD_INVENTORY_ERROR', error.message, adminId);
    return { success: false, error: error.message };
  }
}

/**
 * Admin ปรับสต็อกอย่างรวดเร็ว (เพิ่ม/ลด ทีละ 1)
 * @param {string} itemId - ID สินค้า
 * @param {number} change - จำนวนที่เปลี่ยนแปลง (+1 หรือ -1)
 * @param {string} adminId - ID ผู้ดูแล
 * @returns {Object} ผลการปรับ
 */
function adminQuickAdjustInventory(itemId, change, adminId = 'ADMIN') {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Inventory');

    if (!sheet) throw new Error('ไม่พบชีต Inventory');

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

    if (foundRow === -1) throw new Error(`ไม่พบสินค้า: ${itemId}`);

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

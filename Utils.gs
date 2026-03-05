/**
 * Beauty Noodle Shop - Utils.gs
 * เครื่องมือเสริม: Logging, Response Helper, Backup, Data Validation
 * @version 8.2.0
 */

// ============================================================================
// RESPONSE HELPER
// ============================================================================

/**
 * สร้าง JSON Response
 */
function createJSONResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * สร้าง Error Response แบบมาตรฐาน
 */
function createErrorResponse(message, code = 500) {
  return createJSONResponse({
    success: false,
    error: message,
    code: code,
    timestamp: new Date().toISOString()
  });
}

/**
 * สร้าง Success Response แบบมาตรฐาน
 */
function createSuccessResponse(data, message = '') {
  return createJSONResponse({
    success: true,
    data: data,
    message: message,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * บันทึก Log ลงชีต Logs
 */
function logAction(action, details, userId) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('Logs');

    if (!sheet) {
      sheet = ss.insertSheet('Logs');
      sheet.getRange('A1:F1').setValues([
        ['timestamp', 'userId', 'action', 'details', 'ip_address', 'user_agent']
      ]);
      sheet.setFrozenRows(1);
    }

    // จำกัดความยาวของ details เพื่อไม่ให้เกินขีดจำกัด
    const safeDetails = details ? details.toString().substring(0, 500) : '';
    
    sheet.appendRow([
      new Date(), 
      userId || 'SYSTEM', 
      action, 
      safeDetails, 
      '', 
      ''
    ]);

    // เก็บ Log ไว้แค่ 10,000 แถวล่าสุด
    const maxRows = 10000;
    const currentRows = sheet.getLastRow();
    if (currentRows > maxRows) {
      sheet.deleteRows(2, currentRows - maxRows);
    }

  } catch (error) {
    console.error('Log failed:', error);
    // ถ้า log ไม่ได้ ให้ console ไว้อย่างน้อย
    console.log({action, details, userId, error: error.message});
  }
}

/**
 * อ่าน Logs ย้อนหลัง (สำหรับ Admin)
 */
function getRecentLogs(limit = 100) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Logs');
    
    if (!sheet) return { success: true, data: [] };
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1).reverse(); // เรียงจากใหม่ไปเก่า
    
    const logs = rows.slice(0, limit).map(row => ({
      timestamp: row[0],
      userId: row[1],
      action: row[2],
      details: row[3]
    }));
    
    return { success: true, data: logs };
    
  } catch (error) {
    logAction('GET_LOGS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ล้าง Logs เก่า (เรียกผ่าน Time Trigger)
 */
function cleanOldLogs() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Logs');
    
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90); // เก็บ 90 วัน
    
    let rowsToDelete = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const logDate = new Date(rows[i][0]);
      if (logDate < cutoff) {
        rowsToDelete.push(i + 2); // +2 เพราะ index 0 คือ header
      }
    }
    
    // ลบจากล่างขึ้นบนเพื่อไม่ให้ index เพี้ยน
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowNum => sheet.deleteRow(rowNum));
    
    logAction('CLEAN_LOGS', `Deleted ${rowsToDelete.length} old logs`, 'SYSTEM');
    
  } catch (error) {
    console.error('Clean logs error:', error);
  }
}

// ============================================================================
// BACKUP
// ============================================================================

/**
 * สร้าง Backup อัตโนมัติ (ตั้งเวลาให้รันทุกวัน)
 */
function createBackup() {
  try {
    const ss = getSpreadsheet();
    const backupName = `BeautyNoodle_Backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;

    const backupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName);

    // หาโฟลเดอร์ Backup หรือสร้างใหม่
    let backupFolder;
    const folderIterator = DriveApp.getFoldersByName('BeautyNoodleBackups');
    if (!folderIterator.hasNext()) {
      backupFolder = DriveApp.createFolder('BeautyNoodleBackups');
    } else {
      backupFolder = folderIterator.next();
    }

    backupFile.moveTo(backupFolder);

    // ลบ Backup เก่าที่เกิน 30 วัน
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const files = backupFolder.getFiles();
    let deletedCount = 0;
    while (files.hasNext()) {
      const file = files.next();
      if (file.getDateCreated() < cutoff) {
        file.setTrashed(true);
        deletedCount++;
      }
    }

    logAction('BACKUP_CREATED', `Backup created: ${backupName}, deleted ${deletedCount} old backups`, 'SYSTEM');
    
    return { success: true, message: `Backup created: ${backupName}` };

  } catch (error) {
    logAction('BACKUP_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * รายการ Backup ทั้งหมด
 */
function listBackups() {
  try {
    const folderIterator = DriveApp.getFoldersByName('BeautyNoodleBackups');
    if (!folderIterator.hasNext()) {
      return { success: true, data: [] };
    }
    
    const backupFolder = folderIterator.next();
    const files = backupFolder.getFiles();
    const backups = [];
    
    while (files.hasNext()) {
      const file = files.next();
      backups.push({
        name: file.getName(),
        id: file.getId(),
        size: file.getSize(),
        created: file.getDateCreated(),
        url: file.getUrl()
      });
    }
    
    // เรียงตามวันที่สร้าง ล่าสุดขึ้นก่อน
    backups.sort((a, b) => b.created - a.created);
    
    return { success: true, data: backups };
    
  } catch (error) {
    logAction('LIST_BACKUPS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// DATA VALIDATION
// ============================================================================

/**
 * ตรวจสอบความถูกต้องของ Email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * ตรวจสอบความถูกต้องของเบอร์โทรศัพท์ไทย
 */
function isValidThaiPhone(phone) {
  // เบอร์โทรศัพท์ไทย 9-10 หลัก ขึ้นต้นด้วย 0
  const phoneRegex = /^0[0-9]{8,9}$/;
  return phoneRegex.test(phone.replace(/-/g, ''));
}

/**
 * ตรวจสอบความถูกต้องของราคา
 */
function isValidPrice(price) {
  return !isNaN(price) && price >= 0 && price <= 1000000;
}

/**
 * ตรวจสอบความถูกต้องของจำนวนสต็อก
 */
function isValidStock(stock) {
  return !isNaN(stock) && stock >= 0 && stock <= 1000000;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * ล้าง Cache ทั้งหมด
 */
function clearAllCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll();
    logAction('CACHE_CLEARED', 'All cache cleared', 'SYSTEM');
    return { success: true };
  } catch (error) {
    logAction('CACHE_CLEAR_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * อัปเดต Cache สำหรับ Menu
 */
function refreshMenuCache() {
  try {
    const cache = CacheService.getScriptCache();
    const menu = getMenuItemsWithDetails(); // เรียกใหม่เพื่อ refresh
    cache.put('menu_items', JSON.stringify(menu), 300);
    logAction('CACHE_REFRESHED', 'Menu cache refreshed', 'SYSTEM');
    return { success: true };
  } catch (error) {
    logAction('CACHE_REFRESH_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SYSTEM HEALTH CHECK
// ============================================================================

/**
 * ตรวจสอบสถานะระบบทั้งหมด
 */
function systemHealthCheck() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    // ตรวจสอบ Spreadsheet
    try {
      const ss = getSpreadsheet();
      health.checks.spreadsheet = {
        status: 'ok',
        name: ss.getName(),
        url: ss.getUrl()
      };
    } catch (e) {
      health.checks.spreadsheet = { status: 'error', message: e.message };
      health.status = 'degraded';
    }
    
    // ตรวจสอบ LINE Configuration
    const lineConfig = getLineConfig();
    health.checks.line = {
      status: lineConfig.channelAccessToken ? 'ok' : 'warning',
      configured: !!(lineConfig.channelAccessToken && lineConfig.channelSecret && lineConfig.groupId),
      message: lineConfig.channelAccessToken ? 'LINE configured' : 'LINE not fully configured'
    };
    
    // ตรวจสอบจำนวน Logs
    try {
      const ss = getSpreadsheet();
      const logsSheet = ss.getSheetByName('Logs');
      if (logsSheet) {
        const logCount = logsSheet.getLastRow() - 1;
        health.checks.logs = {
          status: logCount < 9000 ? 'ok' : 'warning',
          count: logCount,
          message: logCount < 9000 ? 'Logs within limit' : 'Logs approaching limit'
        };
      }
    } catch (e) {
      health.checks.logs = { status: 'error', message: e.message };
    }
    
    // ตรวจสอบ Cache
    try {
      const cache = CacheService.getScriptCache();
      const testCache = cache.get('health_check');
      health.checks.cache = { status: 'ok' };
    } catch (e) {
      health.checks.cache = { status: 'error', message: e.message };
    }
    
    return { success: true, data: health };
    
  } catch (error) {
    logAction('HEALTH_CHECK_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// DATA MIGRATION / UPGRADE
// ============================================================================

/**
 * อัปเกรดโครงสร้างข้อมูล (เรียกเมื่อมีการเปลี่ยนแปลง Schema)
 */
function upgradeDatabaseSchema() {
  try {
    const ss = getSpreadsheet();
    const version = '8.1.0';
    
    // ตรวจสอบและเพิ่มคอลัมน์ที่อาจขาดหายไปในแต่ละชีต
    
    // Orders sheet - เพิ่มคอลัมน์ customer_email ถ้ายังไม่มี
    const ordersSheet = ss.getSheetByName('Orders');
    if (ordersSheet) {
      const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
      if (!headers.includes('customer_email')) {
        const lastCol = ordersSheet.getLastColumn() + 1;
        ordersSheet.getRange(1, lastCol).setValue('customer_email');
        logAction('SCHEMA_UPGRADE', 'Added customer_email column to Orders', 'SYSTEM');
      }
    }
    
    // Inventory sheet - เพิ่มคอลัมน์ barcode ถ้ายังไม่มี
    const inventorySheet = ss.getSheetByName('Inventory');
    if (inventorySheet) {
      const headers = inventorySheet.getRange(1, 1, 1, inventorySheet.getLastColumn()).getValues()[0];
      if (!headers.includes('barcode')) {
        const lastCol = inventorySheet.getLastColumn() + 1;
        inventorySheet.getRange(1, lastCol).setValue('barcode');
        logAction('SCHEMA_UPGRADE', 'Added barcode column to Inventory', 'SYSTEM');
      }
    }
    
    // บันทึกเวอร์ชันล่าสุด
    const configSheet = ss.getSheetByName('Config');
    if (configSheet) {
      const data = configSheet.getDataRange().getValues();
      let foundRow = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'db_version') {
          foundRow = i + 1;
          break;
        }
      }
      if (foundRow === -1) {
        configSheet.appendRow(['db_version', version]);
      } else {
        configSheet.getRange(foundRow, 2).setValue(version);
      }
    }
    
    logAction('SCHEMA_UPGRADE', `Database upgraded to version ${version}`, 'SYSTEM');
    return { success: true, message: `Upgraded to version ${version}` };
    
  } catch (error) {
    logAction('SCHEMA_UPGRADE_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * Beauty Noodle Shop - Utils.gs
 * เครื่องมือเสริม: Logging, Response Helper, Backup
 * @version 8.0.0
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
    }

    sheet.appendRow([new Date(), userId || 'SYSTEM', action, details, '', '']);

    // เก็บ Log ไว้แค่ 10,000 แถวล่าสุด
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
// BACKUP
// ============================================================================

/**
 * สร้าง Backup อัตโนมัติ (ตั้งเวลาให้รันทุกวัน)
 */
function createBackup() {
  try {
    const ss = getSpreadsheet();
    const backupName = `Backup_${new Date().toISOString().slice(0, 10)}`;

    const backupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName);

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

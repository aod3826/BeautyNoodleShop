var Utils = {

  getSpreadsheet: function() {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not found. Please run initialSetup() first.');
    }
    return SpreadsheetApp.openById(spreadsheetId);
  },

  verifyAdminToken: function(token) {
    const validToken = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
    return token === validToken;
  },

  verifyApiKey: function(key) {
    const validKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    return key === validKey;
  },

  checkRateLimit: function(userId = 'anonymous') {
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
  },

  createJSONResponse: function(data) {
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  },

  logAction: function(action, details, userId) {
    try {
      const ss = this.getSpreadsheet();
      let sheet = ss.getSheetByName('Logs');
      if (!sheet) {
        sheet = ss.insertSheet('Logs');
        sheet.getRange('A1:F1').setValues([['timestamp', 'userId', 'action', 'details', 'ip_address', 'user_agent']]);
      }
      sheet.appendRow([new Date(), userId || 'SYSTEM', action, details, '', '']);
      
      const maxRows = 10000;
      const currentRows = sheet.getLastRow();
      if (currentRows > maxRows) {
        sheet.deleteRows(2, currentRows - maxRows);
      }
    } catch (error) {
      console.error('Log failed:', error);
    }
  },

  getStockStatus: function(current, min) {
    if (current <= 0) return 'out';
    if (current <= min) return 'low';
    if (current <= min * 2) return 'medium';
    return 'high';
  },

  adminLogin: function(username, password) {
    const properties = PropertiesService.getScriptProperties();
    const validUsername = properties.getProperty('ADMIN_USER') || 'admin';
    const validPassword = properties.getProperty('ADMIN_PASS') || '123';
    
    if (username === validUsername && password === validPassword) {
      const token = properties.getProperty('ADMIN_TOKEN');
      this.logAction('ADMIN_LOGIN', 'Login successful', username);
      return { success: true, data: { token: token } };
    }
    
    this.logAction('ADMIN_LOGIN_FAILED', `Failed login attempt for: ${username}`, 'SYSTEM');
    return { success: false, error: 'Invalid credentials' };
  },

  // LINE sending functions (sendLineFlexMessage, sendLineTextMessage, sendLineBroadcast, sendLineMessage, sendLineTestMessage, validateLineSignature)
  // copy มาทั้งหมดเหมือนเดิม แค่ห่อใน Utils. และเรียก Config.getLineConfig() แทน getLineConfig()
  sendLineFlexMessage: function(orderData) {
    try {
      const lineConfig = Config.getLineConfig();
      if (!lineConfig.channelAccessToken || !lineConfig.groupId) {
        Logger.log('LINE not configured');
        return false;
      }
      
      // ... body เดิมทั้งหมด จนถึง return sendLineMessage(flexMessage);
    } catch (error) {
      Utils.logAction('LINE_FLEX_ERROR', error.message, 'SYSTEM');
      return false;
    }
  },

  sendLineTextMessage: function(orderData) {
    // เดิมทั้งหมด
  },

  sendLineBroadcast: function(message, imageUrl, isUrgent = false) {
    // เดิมทั้งหมด
  },

  sendLineMessage: function(payload) {
    try {
      const lineConfig = Config.getLineConfig();
      if (!lineConfig.channelAccessToken) {
        throw new Error('LINE Channel Access Token not configured');
      }
      
      const url = 'https://api.line.me/v2/bot/message/push';
      // ... เดิมทั้งหมด จนถึง return true/false
    } catch (error) {
      Utils.logAction('LINE_SEND_ERROR', error.message, 'SYSTEM');
      return false;
    }
  },

  sendLineTestMessage: function() {
    try {
      const lineConfig = Config.getLineConfig();
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
      
      return this.sendLineMessage(testMessage);
    } catch (error) {
      Utils.logAction('LINE_TEST_ERROR', error.message, 'SYSTEM');
      return false;
    }
  },

  validateLineSignature: function(body, signature, channelSecret) {
    if (!channelSecret) return false;
    const hash = Utilities.computeHmacSha256Signature(
      Utilities.base64Decode(Utilities.base64Encode(body)),
      channelSecret
    );
    const computedSignature = Utilities.base64Encode(hash);
    return computedSignature === signature;
  },

  createLogsSheet: function(ss) {
    let sheet = ss.getSheetByName('Logs');
    if (!sheet) {
      sheet = ss.insertSheet('Logs');
      const headers = [['timestamp', 'userId', 'action', 'details', 'ip_address', 'user_agent']];
      sheet.getRange('A1:F1').setValues(headers);
      sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
    }
    sheet.setFrozenRows(1);
    Logger.log('✓ Logs sheet ready');
  },

  createBackup: function() {
    try {
      const ss = this.getSpreadsheet();
      const backupName = `Backup_${new Date().toISOString().slice(0,10)}`;
      
      const backupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName);
      
      let backupFolder = DriveApp.getFoldersByName('BeautyNoodleBackups');
      if (!backupFolder.hasNext()) {
        backupFolder = DriveApp.createFolder('BeautyNoodleBackups');
      } else {
        backupFolder = backupFolder.next();
      }
      
      backupFile.moveTo(backupFolder);
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const files = backupFolder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        if (file.getDateCreated() < cutoff) {
          file.setTrashed(true);
        }
      }
      
      this.logAction('BACKUP_CREATED', `Backup created: ${backupName}`, 'SYSTEM');
    } catch (error) {
      this.logAction('BACKUP_ERROR', error.message, 'SYSTEM');
    }
  }
};

// ตัวแปร global ที่ต้องประกาศไว้นอก namespace (เพราะ rate limit ใช้)
var requestCounts = {};

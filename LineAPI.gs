/**
 * Beauty Noodle Shop - LineAPI.gs
 * LINE Messaging API: Setup, Send, Webhook, Broadcast
 * @version 8.2.0
 * 
 * หมายเหตุ: ปรับปรุงจาก LINE Notify (ปิดให้บริการ 1 เม.ย. 2025) 
 *          มาใช้ LINE Messaging API แทน
 */

// ============================================================================
// LINE CONFIGURATION
// ============================================================================

/**
 * ดึงค่า LINE Configuration จาก Script Properties
 * @returns {Object} { channelAccessToken, channelSecret, groupId }
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
 * ตรวจสอบว่า LINE Messaging API พร้อมใช้งานหรือไม่
 * @returns {boolean} true ถ้าตั้งค่าครบถ้วน
 */
function isLineMessagingReady() {
  const config = getLineConfig();
  return !!(config.channelAccessToken && config.channelSecret && config.groupId);
}

/**
 * บันทึกการตั้งค่า LINE Messaging API
 * @param {Object} payload - ข้อมูลการตั้งค่า { lineToken, lineSecret, lineGroupId, adminId }
 * @returns {Object} ผลการบันทึก { success, error? }
 */
function saveLineSettings(payload) {
  try {
    const properties = PropertiesService.getScriptProperties();

    // บันทึกเฉพาะค่าที่ส่งมา (ไม่ต้องส่งทั้งหมดก็ได้)
    if (payload.lineToken) {
      properties.setProperty('LINE_CHANNEL_ACCESS_TOKEN', payload.lineToken.trim());
    }
    if (payload.lineSecret) {
      properties.setProperty('LINE_CHANNEL_SECRET', payload.lineSecret.trim());
    }
    if (payload.lineGroupId) {
      properties.setProperty('LINE_GROUP_ID', payload.lineGroupId.trim());
    }

    logAction('LINE_SETTINGS_SAVED', 'LINE Messaging API settings updated', payload.adminId || 'ADMIN');

    return { success: true };

  } catch (error) {
    logAction('LINE_SETTINGS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูลการตั้งค่า LINE (สำหรับแสดงในหน้า Settings)
 * @returns {Object} ข้อมูลการตั้งค่า (ไม่ส่ง token จริงกลับไป)
 */
function getLineSettingsData() {
  try {
    const lineConfig = getLineConfig();
    const isReady = isLineMessagingReady();
    
    return {
      success: true,
      data: {
        hasToken: !!lineConfig.channelAccessToken,
        hasSecret: !!lineConfig.channelSecret,
        groupId: lineConfig.groupId || '',
        // ส่งเฉพาะตัวอย่าง token (4 ตัวแรก + 4 ตัวสุดท้าย)
        tokenPreview: lineConfig.channelAccessToken 
          ? lineConfig.channelAccessToken.substring(0, 4) + '...' + lineConfig.channelAccessToken.slice(-4)
          : '',
        isConfigured: isReady,
        message: isReady 
          ? '✅ เชื่อมต่อ LINE Messaging API พร้อมใช้งาน' 
          : '⚠️ กรุณาตั้งค่า LINE Messaging API ให้ครบถ้วน (Token, Secret, Group ID)'
      }
    };
  } catch (error) {
    logAction('GET_LINE_SETTINGS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ตั้งค่า LINE Messaging API แบบอัตโนมัติ (ใช้สำหรับ testing)
 * @param {Object} config - ข้อมูลการตั้งค่า (ไม่จำเป็น)
 * @returns {Object} ผลการตั้งค่า
 */
function setupLineMessaging(config) {
  try {
    const props = PropertiesService.getScriptProperties();

    // ถ้าไม่ส่ง config มา ให้ใช้ค่าเริ่มต้น (สำหรับทดสอบ)
    const lineData = config || {
      token: 'YOUR_CHANNEL_ACCESS_TOKEN',
      secret: 'YOUR_CHANNEL_SECRET',
      groupId: 'YOUR_GROUP_ID'
    };

    if (lineData.token && lineData.token !== 'YOUR_CHANNEL_ACCESS_TOKEN') {
      props.setProperty('LINE_CHANNEL_ACCESS_TOKEN', lineData.token);
    }
    if (lineData.secret && lineData.secret !== 'YOUR_CHANNEL_SECRET') {
      props.setProperty('LINE_CHANNEL_SECRET', lineData.secret);
    }
    if (lineData.groupId && lineData.groupId !== 'YOUR_GROUP_ID') {
      props.setProperty('LINE_GROUP_ID', lineData.groupId);
    }

    // ทดสอบการส่งข้อความ
    const testResult = sendLineTestMessage();

    if (testResult) {
      Logger.log('✅ LINE Messaging API Setup Success');
      return { 
        success: true, 
        message: 'ตั้งค่าและเชื่อมต่อ LINE Messaging API สำเร็จ' 
      };
    } else {
      Logger.log('⚠️ LINE Messaging API Setup Warning: บันทึกค่าแล้ว แต่ส่งข้อความทดสอบไม่สำเร็จ');
      return { 
        success: false, 
        message: 'บันทึกค่าแล้ว แต่เชื่อมต่อ LINE ไม่สำเร็จ กรุณาตรวจสอบ Token และ Group ID' 
      };
    }

  } catch (e) {
    Logger.log('❌ LINE Setup Error: ' + e.toString());
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + e.message };
  }
}

// ============================================================================
// LINE SIGNATURE VERIFICATION (สำหรับ Webhook)
// ============================================================================

/**
 * ตรวจสอบความถูกต้องของ LINE webhook signature
 * @param {string} body - raw request body
 * @param {string} signature - signature จาก header 'X-LINE-Signature'
 * @param {string} channelSecret - channel secret
 * @returns {boolean} true ถ้าถูกต้อง
 */
function validateLineSignature(body, signature, channelSecret) {
  if (!channelSecret || !signature) return false;

  try {
    const hash = Utilities.computeHmacSha256Signature(
      body,
      channelSecret
    );
    const computedSignature = Utilities.base64Encode(hash);
    return computedSignature === signature;
  } catch (e) {
    logAction('LINE_SIGNATURE_ERROR', e.message, 'SYSTEM');
    return false;
  }
}

// ============================================================================
// SEND MESSAGE FUNCTIONS (LINE Messaging API)
// ============================================================================

/**
 * ฟังก์ชันหลักสำหรับส่ง LINE Message ผ่าน Messaging API
 * @param {Object} payload - ข้อความที่จะส่ง (ตามรูปแบบ LINE Messaging API)
 * @returns {boolean} true ถ้าส่งสำเร็จ
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
    const responseText = response.getContentText();

    if (responseCode === 200) {
      Logger.log('✅ LINE message sent successfully');
      return true;
    } else {
      Logger.log(`❌ LINE API error: ${responseCode} - ${responseText}`);
      return false;
    }

  } catch (error) {
    logAction('LINE_SEND_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ทดสอบส่ง LINE Message ผ่าน Messaging API
 * @returns {boolean} true ถ้าส่งสำเร็จ
 */
function sendLineTestMessage() {
  try {
    const lineConfig = getLineConfig();
    
    if (!lineConfig.channelAccessToken) {
      throw new Error('Missing LINE Channel Access Token');
    }
    
    if (!lineConfig.channelSecret) {
      throw new Error('Missing LINE Channel Secret');
    }
    
    if (!lineConfig.groupId) {
      throw new Error('Missing LINE Group/User ID');
    }

    const testMessage = {
      to: lineConfig.groupId,
      messages: [{
        type: 'text',
        text: '✅ การเชื่อมต่อ LINE Messaging API สำเร็จ!\n' +
              'ร้าน Beauty Noodle พร้อมรับการแจ้งเตือนออเดอร์แล้ว'
      }]
    };

    const success = sendLineMessage(testMessage);
    
    if (success) {
      logAction('LINE_TEST_SUCCESS', 'LINE Messaging API test successful', 'SYSTEM');
    } else {
      logAction('LINE_TEST_FAILED', 'LINE Messaging API test failed', 'SYSTEM');
    }
    
    return success;

  } catch (error) {
    logAction('LINE_TEST_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ส่ง Flex Message ไปยัง LINE (แบบสวยงาม)
 * @param {Object} orderData - ข้อมูลออเดอร์
 * @returns {boolean} true ถ้าส่งสำเร็จ
 */
function sendLineFlexMessage(orderData) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken || !lineConfig.groupId) {
      Logger.log('LINE not configured');
      return false;
    }

    // สร้างรายการอาหาร
    const menuItems = orderData.items.map(item =>
      `${item.quantity}x ${item.menuName}${item.options.length ? ' (' + item.options.join(', ') + ')' : ''}`
    ).join('\n');

    // สร้าง Flex Message ตามรูปแบบ LINE Messaging API
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
                      { type: 'text', text: 'รหัสออเดอร์', color: '#aaaaaa', size: 'sm', flex: 2 },
                      { type: 'text', text: orderData.orderId, color: '#d97706', size: 'sm', flex: 3, weight: 'bold', wrap: true }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      { type: 'text', text: 'ยอดรวม', color: '#aaaaaa', size: 'sm', flex: 2 },
                      { type: 'text', text: `฿${orderData.totalPrice}`, color: '#d97706', size: 'sm', flex: 3, weight: 'bold' }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      { type: 'text', text: 'ประเภท', color: '#aaaaaa', size: 'sm', flex: 2 },
                      { type: 'text', text: orderData.type === 'dine-in' ? 'ทานที่ร้าน' : 'ซื้อกลับ', color: '#666666', size: 'sm', flex: 3 }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      { type: 'text', text: 'ชำระเงิน', color: '#aaaaaa', size: 'sm', flex: 2 },
                      {
                        type: 'text',
                        text: orderData.payment === 'cash' ? 'เงินสด' :
                              orderData.payment === 'qr-code' ? 'พร้อมเพย์' : 'โอนเงิน',
                        color: '#666666', size: 'sm', flex: 3
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
                  { type: 'separator' },
                  { type: 'text', text: '📝 รายการอาหาร', weight: 'bold', size: 'md', margin: 'lg' },
                  { type: 'text', text: menuItems, color: '#666666', size: 'sm', wrap: true }
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
                  uri: 'https://script.google.com/macros/s/AKfycbzHRT_TogzIchfNcdJ2MiAmtzxJJuFNQddJ6vsd2TW0pUWPx-fQyfb8MVeJ0PakpRqa/exec?action=admin'
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
 * ส่ง Text Message (Fallback เมื่อส่ง Flex ไม่ได้)
 * @param {Object} orderData - ข้อมูลออเดอร์
 * @returns {boolean} true ถ้าส่งสำเร็จ
 */
function sendLineTextMessage(orderData) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken || !lineConfig.groupId) return false;

    const itemsText = orderData.items.map(item =>
      `${item.quantity}x ${item.menuName}${item.options.length ? ' (' + item.options.join(', ') + ')' : ''}`
    ).join('\n');

    const message =
      `🍜 *ออเดอร์ใหม่!*\n` +
      `─────────────────\n` +
      `🆔 รหัส: ${orderData.orderId}\n` +
      `💰 ยอดรวม: ฿${orderData.totalPrice}\n` +
      `🍽️ ประเภท: ${orderData.type === 'dine-in' ? 'ทานที่ร้าน' : 'ซื้อกลับ'}\n` +
      `💳 ชำระ: ${orderData.payment === 'cash' ? 'เงินสด' : orderData.payment === 'qr-code' ? 'พร้อมเพย์' : 'โอนเงิน'}\n` +
      `─────────────────\n` +
      `📋 *รายการอาหาร*\n` +
      `${itemsText}\n` +
      `─────────────────\n` +
      `👉 ดูรายละเอียด: https://script.google.com/macros/s/AKfycbzHRT_TogzIchfNcdJ2MiAmtzxJJuFNQddJ6vsd2TW0pUWPx-fQyfb8MVeJ0PakpRqa/exec?action=admin`;

    const payload = {
      to: lineConfig.groupId,
      messages: [{ type: 'text', text: message }]
    };

    return sendLineMessage(payload);

  } catch (error) {
    logAction('LINE_TEXT_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ส่งข้อความแจ้งเตือนสถานะออเดอร์
 * @param {string} orderId - รหัสออเดอร์
 * @param {string} newStatus - สถานะใหม่
 * @returns {boolean} true ถ้าส่งสำเร็จ
 */
function sendOrderStatusNotification(orderId, newStatus) {
  try {
    const order = getOrderById(orderId);
    if (!order) return false;

    const statusThai = {
      'Pending':   '⏳ รอดำเนินการ',
      'Confirmed': '✓ ยืนยันออเดอร์',
      'Preparing': '👨‍🍳 กำลังทำ',
      'Ready':     '✅ ทำเสร็จแล้ว',
      'Completed': '🏁 เสร็จสิ้น',
      'Cancelled': '❌ ยกเลิก'
    };

    const message =
      `🔔 *อัปเดตสถานะออเดอร์*\n` +
      `─────────────────\n` +
      `🆔 รหัส: ${orderId}\n` +
      `📌 สถานะ: ${statusThai[newStatus] || newStatus}\n` +
      `💰 ยอดรวม: ฿${order.totalPrice}\n` +
      `─────────────────\n` +
      `ขอบคุณที่ใช้บริการ Beauty Noodle ค่ะ 🙏`;

    const lineConfig = getLineConfig();
    if (lineConfig.channelAccessToken && lineConfig.groupId) {
      const payload = {
        to: lineConfig.groupId,
        messages: [{ type: 'text', text: message }]
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
 * ส่ง Broadcast Message ไปยังผู้ติดตามทั้งหมด
 * @param {string} message - ข้อความ
 * @param {string} imageUrl - URL รูปภาพ (ไม่จำเป็น)
 * @param {boolean} isUrgent - เป็นข้อความด่วนหรือไม่
 * @returns {boolean} true ถ้าส่งสำเร็จ
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

    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.channelAccessToken
      },
      payload: JSON.stringify({ messages: messages }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      Logger.log('✅ Broadcast sent successfully');
      logAction('LINE_BROADCAST', `Broadcast sent: ${message.substring(0, 50)}...`, 'SYSTEM');
      return true;
    } else {
      Logger.log(`❌ Broadcast failed: ${response.getContentText()}`);
      return false;
    }

  } catch (error) {
    logAction('LINE_BROADCAST_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

// ============================================================================
// WEBHOOK HANDLER (สำหรับรับข้อความจาก LINE)
// ============================================================================

/**
 * Webhook สำหรับรับข้อความจาก LINE และตอบกลับอัตโนมัติ
 * @param {Object} webhookData - ข้อมูลจาก LINE
 * @returns {Object} response
 */
function handleLineWebhook(webhookData) {
  try {
    // ดึง Config
    const lineConfig = getLineConfig(); 
    
    if (!lineConfig.channelAccessToken) {
      logAction('LINE_WEBHOOK_ERROR', 'LINE not configured', 'SYSTEM');
      return createJSONResponse({ status: 'error', message: 'LINE not configured' });
    }

    if (webhookData.events && Array.isArray(webhookData.events)) {
      webhookData.events.forEach(event => {
        // ตรวจสอบ signature (ควรทำในการใช้งานจริง)
        
        if (event.type === 'message' && event.message.type === 'text') {
          const replyToken = event.replyToken;
          const userMessage = event.message.text.toLowerCase();
          const userId = event.source.userId;

          let replyPayloadMessages = [];

          // ตอบกลับตามข้อความที่ได้รับ
          if (userMessage.includes('สวัสดี') || userMessage.includes('hello')) {
            replyPayloadMessages.push({ 
              type: 'text', 
              text: 'สวัสดีค่ะ ร้าน Beauty Noodle ยินดีให้บริการค่ะ 🙏' 
            });
          } else if (userMessage.includes('เมนู') || userMessage.includes('menu')) {
            replyPayloadMessages.push({
              type: 'flex',
              altText: 'เมนูอาหาร Beauty Noodle',
              contents: createMenuFlexTemplate()
            });
          } else if (userMessage.includes('เวลา') || userMessage.includes('เปิด')) {
            replyPayloadMessages.push({ 
              type: 'text', 
              text: 'ร้าน Beauty Noodle เปิดทุกวัน 08:00 - 20:00 น. ค่ะ 🙏' 
            });
          } else if (userMessage.includes('เบอร์') || userMessage.includes('โทร')) {
            replyPayloadMessages.push({ 
              type: 'text', 
              text: 'ติดต่อสอบถามหรือสั่งอาหารได้ที่เบอร์: 065-387-7411 ค่ะ 📞' 
            });
          } else if (userMessage.includes('ที่อยู่') || userMessage.includes('อยู่ที่ไหน')) {
            replyPayloadMessages.push({ 
              type: 'text', 
              text: 'ร้านอยู่ที่: 123 ถนนสุขุมวิท กรุงเทพฯ (ใกล้ BTS อโศก) ค่ะ 🗺️' 
            });
          } else {
            // ข้อความทั่วไป
            replyPayloadMessages.push({ 
              type: 'text', 
              text: 'ขอบคุณที่ติดต่อร้าน Beauty Noodle ค่ะ\n' +
                    'พิมพ์ "เมนู" เพื่อดูรายการอาหาร หรือ "เบอร์" สำหรับติดต่อร้าน' 
            });
          }

          // ส่งข้อความตอบกลับ
          const url = 'https://api.line.me/v2/bot/message/reply';
          const options = {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + lineConfig.channelAccessToken
            },
            payload: JSON.stringify({
              replyToken: replyToken,
              messages: replyPayloadMessages
            }),
            muteHttpExceptions: true
          };

          UrlFetchApp.fetch(url, options);
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

/**
 * สร้าง Flex Message Template สำหรับแสดงเมนู
 * @returns {Object} Flex Message structure
 */
function createMenuFlexTemplate() {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1559310541-2b2f7c3d3b3d?w=1200&h=600&fit=crop',
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🍜 เมนูแนะนำ',
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
              type: 'text',
              text: '• ก๋วยเตี๋ยวหมูน้ำใส 45฿',
              size: 'md',
              color: '#555555'
            },
            {
              type: 'text',
              text: '• ก๋วยเตี๋ยวต้มยำหมู 55฿',
              size: 'md',
              color: '#555555'
            },
            {
              type: 'text',
              text: '• ข้าวหมูกรอบ 50฿',
              size: 'md',
              color: '#555555'
            },
            {
              type: 'text',
              text: '• เกี๊ยวทอด 30฿',
              size: 'md',
              color: '#555555'
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
            label: 'สั่งอาหารออนไลน์',
            uri: 'https://script.google.com/macros/s/AKfycbzHRT_TogzIchfNcdJ2MiAmtzxJJuFNQddJ6vsd2TW0pUWPx-fQyfb8MVeJ0PakpRqa/exec'
          }
        }
      ]
    }
  };
}

/**
 * ฟังก์ชันสร้าง JSON Response (สำหรับ Webhook)
 */
function createJSONResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

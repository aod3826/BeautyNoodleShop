/**
 * Beauty Noodle Shop - LineAPI.gs
 * LINE Messaging API: Setup, Send, Webhook, Broadcast
 * @version 8.1.0
 */

// ============================================================================
// LINE CONFIGURATION
// ============================================================================

/**
 * ดึงค่า LINE Configuration
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
 * บันทึกการตั้งค่า LINE
 */
function saveLineSettings(payload) {
  try {
    const properties = PropertiesService.getScriptProperties();

    // บันทึกเฉพาะที่มีการส่งมา
    if (payload.lineToken) {
      properties.setProperty('LINE_CHANNEL_ACCESS_TOKEN', payload.lineToken);
    }
    if (payload.lineSecret) {
      properties.setProperty('LINE_CHANNEL_SECRET', payload.lineSecret);
    }
    if (payload.lineGroupId) {
      properties.setProperty('LINE_GROUP_ID', payload.lineGroupId);
    }

    logAction('LINE_SETTINGS_SAVED', 'LINE settings updated', payload.adminId || 'ADMIN');

    return { success: true };

  } catch (error) {
    logAction('LINE_SETTINGS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูลการตั้งค่า LINE (สำหรับแสดงในหน้า Settings)
 */
function getLineSettingsData() {
  try {
    const lineConfig = getLineConfig();
    
    // ไม่ส่ง Token จริงกลับไป เพื่อความปลอดภัย
    return {
      success: true,
      data: {
        hasToken: !!lineConfig.channelAccessToken,
        hasSecret: !!lineConfig.channelSecret,
        groupId: lineConfig.groupId || '',
        // ส่งกลับแค่ 4 ตัวแรกและ 4 ตัวสุดท้ายของ Token (ถ้ามี)
        tokenPreview: lineConfig.channelAccessToken 
          ? lineConfig.channelAccessToken.substring(0, 4) + '...' + lineConfig.channelAccessToken.slice(-4)
          : '',
        isConfigured: !!(lineConfig.channelAccessToken && lineConfig.channelSecret && lineConfig.groupId)
      }
    };
  } catch (error) {
    logAction('GET_LINE_SETTINGS_ERROR', error.message, 'SYSTEM');
    return { success: false, error: error.message };
  }
}

/**
 * ตั้งค่า LINE Messaging API แบบปลอดภัย
 * @param {Object} config - (Optional) ข้อมูลที่ส่งมาจากหน้า Admin
 */
function setupLineMessaging(config) {
  try {
    const props = PropertiesService.getScriptProperties();

    const lineData = config || {
      token: 'QURA7S8NmooH+K4Jqdn9kl7PaVQoJHaYni2MDKFLxwXPq5iGZfp9s1ejyy/Os7VlzFlfG2FwEgtVhF7hSl74nVLbkVp49aIG3uPYdDGvJlHyaWLDtoHo4l77r7iSbNO5xy95/0oykmA29B/VWQ4gYwdB04t89/1O/w1cDnyilFU=',
      secret: '9761252456083b6fb0fd80bcec9d4da8',
      groupId: 'Cd11ca7122b5538ddb1589588ba2a7c5f'
    };

    if (lineData.token) props.setProperty('LINE_CHANNEL_ACCESS_TOKEN', lineData.token);
    if (lineData.secret) props.setProperty('LINE_CHANNEL_SECRET', lineData.secret);
    if (lineData.groupId) props.setProperty('LINE_GROUP_ID', lineData.groupId);

    const testResult = sendLineTestMessage();

    if (testResult) {
      Logger.log('✅ LINE Setup Success: ทดสอบส่งข้อความสำเร็จ');
      return { success: true, message: 'ตั้งค่าและเชื่อมต่อ LINE สำเร็จ' };
    } else {
      Logger.log('⚠️ LINE Setup Warning: บันทึกค่าแล้ว แต่ส่งข้อความทดสอบไม่สำเร็จ');
      return { success: false, message: 'บันทึกค่าแล้ว แต่เชื่อมต่อ LINE ไม่สำเร็จ' };
    }

  } catch (e) {
    Logger.log('❌ LINE Setup Error: ' + e.toString());
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + e.message };
  }
}

// ============================================================================
// LINE SIGNATURE VERIFICATION
// ============================================================================

/**
 * ตรวจสอบความถูกต้องของ LINE webhook signature
 */
function validateLineSignature(body, signature, channelSecret) {
  if (!channelSecret) return false;

  const hash = Utilities.computeHmacSha256Signature(
    Utilities.base64Decode(Utilities.base64Encode(body)),
    channelSecret
  );
  const computedSignature = Utilities.base64Encode(hash);
  return computedSignature === signature;
}

// ============================================================================
// SEND MESSAGE FUNCTIONS
// ============================================================================

/**
 * ฟังก์ชันหลักสำหรับส่ง LINE Message
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

    if (responseCode === 200) {
      Logger.log('LINE message sent successfully');
      return true;
    } else {
      const responseText = response.getContentText();
      Logger.log(`LINE API error: ${responseCode} - ${responseText}`);
      return false;
    }

  } catch (error) {
    logAction('LINE_SEND_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ทดสอบส่ง LINE Message
 */
function sendLineTestMessage() {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken || !lineConfig.groupId) {
      throw new Error('LINE not configured');
    }

    const testMessage = {
      to: lineConfig.groupId,
      messages: [{
        type: 'text',
        text: '✅ การเชื่อมต่อ LINE Messaging API สำเร็จ! (ทดสอบจากระบบ Admin)'
      }]
    };

    return sendLineMessage(testMessage);

  } catch (error) {
    logAction('LINE_TEST_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

/**
 * ส่ง Flex Message ไปยัง LINE (แบบสวยงาม)
 */
function sendLineFlexMessage(orderData) {
  try {
    const lineConfig = getLineConfig();
    if (!lineConfig.channelAccessToken || !lineConfig.groupId) {
      Logger.log('LINE not configured');
      return false;
    }

    const menuItems = orderData.items.map(item =>
      `${item.quantity}x ${item.menuName}${item.options.length ? ' (' + item.options.join(', ') + ')' : ''}`
    ).join('\n');

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
 * ส่ง Text Message (Fallback)
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
 * ส่ง Broadcast Message ไปยังทุกคน
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
      Logger.log('Broadcast sent successfully');
      logAction('LINE_BROADCAST', `Broadcast sent: ${message.substring(0, 50)}...`, 'SYSTEM');
      return true;
    } else {
      Logger.log(`Broadcast failed: ${response.getContentText()}`);
      return false;
    }

  } catch (error) {
    logAction('LINE_BROADCAST_ERROR', error.message, 'SYSTEM');
    return false;
  }
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * Webhook สำหรับรับข้อความจาก LINE (เวอร์ชัน Flex Message ภาพใหญ่)
 */
function handleLineWebhook(webhookData) {
  try {
    // ดึง Config (Channel Access Token)
    const lineConfig = getLineConfig(); 
    
    if (!lineConfig.channelAccessToken) {
      logAction('LINE_WEBHOOK_ERROR', 'LINE not configured', 'SYSTEM');
      return createJSONResponse({ status: 'error', message: 'LINE not configured' });
    }

    if (webhookData.events && Array.isArray(webhookData.events)) {
      webhookData.events.forEach(event => {
        if (event.type === 'message' && event.message.type === 'text') {
          const replyToken = event.replyToken;
          const userMessage = event.message.text.toLowerCase(); // ทำเป็นตัวเล็กเพื่อให้เช็คง่ายขึ้น
          const userId = event.source.userId;

          let replyPayloadMessages = [];

          // --- ส่วนตัดสินใจเลือกคำตอบ ---
          if (userMessage.includes('สวัสดี') || userMessage.includes('hello') || userMessage.includes('เมนู')) {
            // ส่งเป็น Flex Message ภาพใหญ่ สวยๆ
            replyPayloadMessages.push({
              "type": "flex",
              "altText": "เมนูและบริการจาก Beauty Noodle 🍜",
              "contents": createBigImageFlexTemplate()
            });
          } else if (userMessage.includes('เวลา') || userMessage.includes('เปิด')) {
            replyPayloadMessages.push({ 
              "type": "text", 
              "text": "ร้าน Beauty Noodle เปิดทุกวัน 08:00 - 20:00 น. ค่ะ 🙏" 
            });
          } else if (userMessage.includes('เบอร์') || userMessage.includes('โทร')) {
            replyPayloadMessages.push({ 
              "type": "text", 
              "text": "ติดต่อสอบถามหรือสั่งอาหารได้ที่เบอร์: 065-387-7411 ค่ะ 📞" 
            });
          } else if (userMessage.includes('ขอบคุณ')) {
            replyPayloadMessages.push({ 
              "type": "text", 
              "text": "ด้วยความยินดีค่ะ ขอบคุณที่ใช้บริการนะคะ 🙏" 
            });
          } else if (userMessage.includes('ที่อยู่') || userMessage.includes('อยู่ที่ไหน')) {
            replyPayloadMessages.push({ 
              "type": "text", 
              "text": "ร้านอยู่ที่: 123 ถนนสุขุมวิท กรุงเทพฯ (ใกล้ BTS อโศก) ค่ะ 🗺️" 
            });
          } else {
            // ข้อความทั่วไป (ส่งข้อความพร้อม Flex Message เพื่อให้ลูกค้ากดง่าย)
            replyPayloadMessages.push({ 
              "type": "text", 
              "text": "สวัสดีค่ะ ร้าน Beauty Noodle ยินดีให้บริการค่ะ สามารถกดดูเมนูหรือโทรสอบถามได้จากปุ่มด้านล่างนี้เลยค่ะ 👇" 
            });
            replyPayloadMessages.push({
              "type": "flex",
              "altText": "เมนู Beauty Noodle",
              "contents": createBigImageFlexTemplate()
            });
          }

          // --- ส่วนการส่งข้อมูลกลับ ---
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
 * ฟังก์ชันสร้างโครงสร้าง Flex Message แบบภาพใหญ่
 */
function createBigImageFlexTemplate() {
  // แปลงลิงก์ Google Drive ให้เป็นลิงก์สำหรับดึงภาพโดยตรง (Direct Link)
  const imageUrl = "https://lh3.googleusercontent.com/d/1LZCrC4uQseVP78Px_xIlFC0RfT-tfkpe";

  return {
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": imageUrl,
      "size": "full",
      "aspectRatio": "1:1", // ปรับสัดส่วนเป็น 1:1 เพื่อให้ภาพสูงและเด่นขึ้น
      "aspectMode": "cover",
      "action": {
        "type": "uri",
        "uri": "https://script.google.com/macros/s/AKfycbzHRT_TogzIchfNcdJ2MiAmtzxJJuFNQddJ6vsd2TW0pUWPx-fQyfb8MVeJ0PakpRqa/exec" // คลิกที่ภาพแล้วไปหน้าเมนู
      }
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { 
          "type": "text", 
          "text": "แม่อ้นก๋วยเตี๋ยว & ตามสั่ง", 
          "weight": "bold", 
          "size": "xl", 
          "color": "#d97706" 
        },
        {
          "type": "box", 
          "layout": "vertical", 
          "margin": "lg", 
          "spacing": "sm",
          "contents": [
            { 
              "type": "text", 
              "text": "🍜 ก๋วยเตี๋ยวรสเด็ด สูตรดั้งเดิม วัตถุดิบสดใหม่", 
              "size": "sm", 
              "color": "#666666" 
            },
            { 
              "type": "text", 
              "text": "⏰ เปิด: 08:00 - 20:00 น.", 
              "size": "sm", 
              "color": "#666666" 
            },
            { 
              "type": "text", 
              "text": "📍 123 ถนนสุขุมวิท กรุงเทพฯ", 
              "size": "sm", 
              "color": "#666666" 
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box", 
      "layout": "vertical", 
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "color": "#d97706",
          "action": {
            "type": "uri",
            "label": "📖 ดูเมนูอาหาร",
            "uri": "https://script.google.com/macros/s/AKfycbzHRT_TogzIchfNcdJ2MiAmtzxJJuFNQddJ6vsd2TW0pUWPx-fQyfb8MVeJ0PakpRqa/exec"
          }
        },
        {
          "type": "button",
          "style": "secondary",
          "action": {
            "type": "uri",
            "label": "📞 โทรสั่งเลย",
            "uri": "tel:0653877411"
          }
        }
      ]
    }
  };
}

/**
 * ฟังก์ชันสร้าง JSON Response
 */
function createJSONResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Beauty Noodle Shop - Auth.gs
 * ระบบความปลอดภัย: Login, Token, API Key Verification
 * @version 8.0.0
 */

// ============================================================================
// TOKEN & API KEY VERIFICATION
// ============================================================================

/**
 * ตรวจสอบ Admin Token
 */
function verifyAdminToken(token) {
  const validToken = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  return token === validToken;
}

/**
 * ตรวจสอบ API Key
 */
function verifyApiKey(key) {
  const validKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  return key === validKey;
}

// ============================================================================
// ADMIN LOGIN
// ============================================================================

/**
 * Admin Login
 */
function adminLogin(username, password) {
  const properties = PropertiesService.getScriptProperties();
  const validUsername = properties.getProperty('ADMIN_USER') || 'admin';
  const validPassword = properties.getProperty('ADMIN_PASS') || '123';

  if (username === validUsername && password === validPassword) {
    const token = properties.getProperty('ADMIN_TOKEN');
    logAction('ADMIN_LOGIN', 'Login successful', username);
    return { success: true, data: { token: token } };
  }

  logAction('ADMIN_LOGIN_FAILED', `Failed login attempt for: ${username}`, 'SYSTEM');
  return { success: false, error: 'Invalid credentials' };
}


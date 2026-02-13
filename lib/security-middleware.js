// === MAGI Security Middleware ===
// Rate limiting, IP logging, anomaly detection, Telegram alerts

const requestLog = new Map();  // IP -> { count, firstSeen, lastSeen, paths }
const blockedIPs = new Set();
const alertsSent = new Map();  // IP -> lastAlertTime

// Configuration
const CONFIG = {
  RATE_LIMIT_WINDOW_MS: 60 * 1000,      // 1 minute window
  RATE_LIMIT_MAX_REQUESTS: 60,            // 60 requests per minute
  BLOCK_THRESHOLD: 200,                   // Block after 200 requests/min
  BLOCK_DURATION_MS: 30 * 60 * 1000,     // 30 min block
  ALERT_COOLDOWN_MS: 5 * 60 * 1000,      // 5 min between alerts per IP
  ADMIN_RATE_LIMIT: 10,                   // 10 requests/min for admin endpoints
  SUSPICIOUS_PATHS: [
    '/wp-admin', '/wp-login', '/.env', '/phpinfo',
    '/admin.php', '/.git', '/config', '/backup',
    '/shell', '/cmd', '/exec', '/eval',
    '/../', '/etc/passwd', '/proc/self'
  ]
};

// Telegram notification
async function sendSecurityAlert(message) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 MAGI SECURITY ALERT\n${message}`,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('[SECURITY] Telegram alert failed:', e.message);
  }
}

// Check if alert should be sent (cooldown)
function shouldAlert(ip) {
  const lastAlert = alertsSent.get(ip);
  if (!lastAlert || Date.now() - lastAlert > CONFIG.ALERT_COOLDOWN_MS) {
    alertsSent.set(ip, Date.now());
    return true;
  }
  return false;
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestLog.entries()) {
    if (now - data.lastSeen > CONFIG.RATE_LIMIT_WINDOW_MS * 2) {
      requestLog.delete(ip);
    }
  }
  for (const [ip, time] of alertsSent.entries()) {
    if (now - time > CONFIG.ALERT_COOLDOWN_MS * 2) {
      alertsSent.delete(ip);
    }
  }
  // Unblock after duration
  for (const ip of blockedIPs) {
    const data = requestLog.get(ip);
    if (data && now - data.blockedAt > CONFIG.BLOCK_DURATION_MS) {
      blockedIPs.delete(ip);
      console.log(`[SECURITY] IP unblocked: ${ip}`);
    }
  }
}, 5 * 60 * 1000);

export function securityMiddleware(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const now = Date.now();
  const path = req.path;
  const method = req.method;

  // 1. Blocked IP check
  if (blockedIPs.has(ip)) {
    console.warn(`[SECURITY] BLOCKED request from ${ip}: ${method} ${path}`);
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  // 2. Suspicious path detection
  const isSuspicious = CONFIG.SUSPICIOUS_PATHS.some(p => path.toLowerCase().includes(p));
  if (isSuspicious) {
    console.warn(`[SECURITY] SUSPICIOUS PATH from ${ip}: ${method} ${path}`);
    if (shouldAlert(ip)) {
      sendSecurityAlert(
        `<b>Suspicious Request</b>\nIP: <code>${ip}</code>\nPath: <code>${method} ${path}</code>\nService: magi-stg`
      );
    }
    return res.status(404).json({ error: 'Not found' });
  }

  // 3. Rate limiting
  let ipData = requestLog.get(ip);
  if (!ipData) {
    ipData = { count: 0, firstSeen: now, lastSeen: now, paths: new Set(), blockedAt: null };
    requestLog.set(ip, ipData);
  }

  // Reset count if window expired
  if (now - ipData.firstSeen > CONFIG.RATE_LIMIT_WINDOW_MS) {
    ipData.count = 0;
    ipData.firstSeen = now;
    ipData.paths = new Set();
  }

  ipData.count++;
  ipData.lastSeen = now;
  ipData.paths.add(path);

  // Admin endpoint stricter rate limit
  const isAdmin = path.startsWith('/admin');
  const limit = isAdmin ? CONFIG.ADMIN_RATE_LIMIT : CONFIG.RATE_LIMIT_MAX_REQUESTS;

  if (ipData.count > CONFIG.BLOCK_THRESHOLD) {
    // Auto-block
    blockedIPs.add(ip);
    ipData.blockedAt = now;
    console.error(`[SECURITY] IP BLOCKED: ${ip} (${ipData.count} requests in 1 min)`);
    if (shouldAlert(ip)) {
      sendSecurityAlert(
        `<b>🔴 IP BLOCKED</b>\nIP: <code>${ip}</code>\nRequests: ${ipData.count}/min\nPaths: ${[...ipData.paths].slice(0, 5).join(', ')}\nService: magi-stg\nDuration: 30 minutes`
      );
    }
    return res.status(429).json({ error: 'Blocked due to excessive requests.' });
  }

  if (ipData.count > limit) {
    console.warn(`[SECURITY] RATE LIMITED: ${ip} (${ipData.count}/${limit} per min) ${method} ${path}`);
    if (ipData.count === limit + 1 && shouldAlert(ip)) {
      sendSecurityAlert(
        `<b>⚠️ Rate Limit Hit</b>\nIP: <code>${ip}</code>\nRequests: ${ipData.count}/${limit}/min\n${isAdmin ? '(Admin endpoint)' : ''}\nService: magi-stg`
      );
    }
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }

  // 4. Log request (non-health endpoints only)
  if (path !== '/health' && path !== '/status') {
    console.log(`[ACCESS] ${ip} ${method} ${path} (${ipData.count}/${limit})`);
  }

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

// Status endpoint for monitoring
export function getSecurityStatus() {
  return {
    activeIPs: requestLog.size,
    blockedIPs: [...blockedIPs],
    recentRequests: [...requestLog.entries()]
      .map(([ip, d]) => ({ ip, count: d.count, paths: [...d.paths].length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  };
}

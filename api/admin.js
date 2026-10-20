const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const same = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

module.exports = (req, res) => {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {            // ayar yoksa kimseyi alma
    res.statusCode = 503;
    return res.end('Admin yapilandirilmamis.');
  }
  const h = req.headers.authorization || '';
  const [u, ...p] = Buffer.from(h.replace(/^Basic /i, ''), 'base64').toString().split(':');
  if (!h.startsWith('Basic ') || !same(u, user) || !same(p.join(':'), pass)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin", charset="UTF-8"');
    return res.end('Giris gerekli.');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(fs.readFileSync(path.join(process.cwd(), 'private', 'admin.html')));
};

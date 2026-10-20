const crypto = require('crypto');
const same = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};
// true dönerse devam; false dönerse cevap zaten gönderildi
module.exports = function auth(req, res) {
  const user = process.env.ADMIN_USER, pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) { res.statusCode = 503; res.end('Admin yapilandirilmamis.'); return false; }
  const h = req.headers.authorization || '';
  const [u, ...p] = Buffer.from(h.replace(/^Basic /i, ''), 'base64').toString().split(':');
  if (!h.startsWith('Basic ') || !same(u, user) || !same(p.join(':'), pass)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin", charset="UTF-8"');
    res.end('Giris gerekli.'); return false;
  }
  return true;
};

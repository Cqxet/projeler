// /holding: Soylu Holding oyunu. Yönetici girişi (api/_auth.js) olmadan hiçbir dosya verilmez.
const fs = require('fs');
const path = require('path');
const auth = require('./_auth');

const ROOT = path.join(process.cwd(), 'private', 'holding');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

module.exports = async (req, res) => {
  if (!(await auth(req, res))) return;
  let p = String((req.query && req.query.p) || '').replace(/^\/+/, '');
  if (!p || p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  const type = TYPES[path.extname(file).toLowerCase()];
  // klasörün dışına çıkma (../) ve izin verilmeyen uzantılar yasak
  if (!file.startsWith(ROOT + path.sep) || !type || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Bulunamadi.');
    return;
  }
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(fs.readFileSync(file));
};

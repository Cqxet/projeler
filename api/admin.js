const fs = require('fs');
const path = require('path');
const auth = require('./_auth');

module.exports = (req, res) => {
  if (!auth(req, res)) return;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(fs.readFileSync(path.join(process.cwd(), 'private', 'admin.html')));
};

const auth = require('./_auth');

// Panelden gelen istekleri, sunucudaki GITHUB_TOKEN ile GitHub'a iletir.
// Sadece izin verilen yollar: bu reponun contents'i ve kullanicinin repo listesi.
module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const clean = v => String(v || '').trim().replace(/^\/+|\/+$/g, '');
  const token = String(process.env.GITHUB_TOKEN || '').trim(), owner = clean(process.env.GH_OWNER), repo = clean(process.env.GH_REPO);
  if (!token || !owner || !repo) { res.statusCode = 503; return res.end('GITHUB_TOKEN / GH_OWNER / GH_REPO tanimli degil.'); }

  let p = String(req.query && req.query.path || '');
  // Repo adı/sahibi istemciden alınmaz; sadece Vercel ayarındaki repo kullanılır.
  const m = p.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.*)$/);
  const okContents = !!m;
  if (m) p = `/repos/${owner}/${repo}/contents/${m[1]}`;
  const okList = p.startsWith('/user/repos?');
  if (p.includes('..') || p.includes('//') || !(okContents || okList)) { res.statusCode = 403; return res.end('Yasak yol.'); }
  if (!['GET', 'PUT'].includes(req.method) || (okList && req.method !== 'GET')) { res.statusCode = 405; return res.end('Yasak metod.'); }

  const r = await fetch('https://api.github.com' + p, {
    method: req.method,
    headers: {
      Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'cqxet-admin'
    },
    body: req.method === 'PUT' ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined
  });
  res.statusCode = r.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(await r.text());
};

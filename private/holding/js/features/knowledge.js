import {applyAction,registerAction} from '../agent-actions.js';
import {presentOf,setRel} from '../ai-core.js';
import {GROUPS,isBoss,isRoom,loyOf,meRole} from '../data.js';
import {ensure} from './finance.js';
import {addFilter,on} from '../hooks.js';
import {live,news} from '../lib/world.js';
import {agent,applyOrg,backIds,chatName,fnm,group,isBack,isChan,isGroup,saveW,state} from '../state.js';
import {clkNow,refresh,renderHudBar} from '../ui-list.js';
/* ================= Kim neyi biliyor: ajan bilgi modeli =================
   state.W.know[agentId] = [{id, key, fact, source, t, truth, spread, from}]
     key    : bilginin kimliği (aynı bilgi bir ajanda bir kez bulunur)
     source : 'oda' | 'özel' | 'dedikodu' | 'belge' | 'karar' | 'ilişki' | 'sızıntı' | 'kulis'
     truth  : false ise bilgi çarpıtılarak ulaşmıştır (ajan doğru sanır)
     spread : kaç el değiştirdiği (0 = ilk elden)
     from   : kimden duyduğu ('user' = kullanıcı)
   Kaynaklar: bulunduğu odadaki konuşmalar (m.pr), özelden söylenenler, perde arkası yazışmalar, belgeler, kararlar, ilişkiler.
   Dedikodu: günlük tick'te ilişki/sadakat/kıskançlık kurallarıyla olasılıksal yayılır ('rumor' eylemi).
   Sızıntı: W.leakLog = [{by, key, to, t}] — köstebek ipuçları bunu ve bilgiyi kimlerin bildiğini kullanır.
   Modelsiz, Math.random dışında deterministik. */
export const MAXF = 30, MAXHOP = 3;
export const WEIGHT = { 'oda': 1, 'özel': 3, 'dedikodu': 2, 'belge': 2, 'karar': 2, 'ilişki': 3, 'sızıntı': 3, 'kulis': 2 };
const SRC = { 'oda': 'odada duydun', 'özel': 'sana özelden söylendi', 'dedikodu': 'dedikodu', 'belge': 'belge', 'karar': 'karar', 'ilişki': 'ilişki', 'sızıntı': 'sızıntı', 'kulis': 'kulis' };
const mem = gid => group(gid)?.members || [];
// Köstebek sızıntı türleri (mole.js kind 0..3) ve onları kimin bildiği
export const SEED = [
  { key: 'yk-kapali', fact: 'Kapalı YK toplantısında alınan kararların içeriği', source: 'oda', who: () => mem('g_yk') },
  { key: 'nakit-tablosu', fact: 'Holdingin iç nakit tablosu ve banka görüşmelerinin ayrıntıları', source: 'belge', who: () => [...mem('g_fin'), ...mem('g_exco')] },
  { key: 'yk-bolunme', fact: 'YK içindeki görüş ayrılıkları ve kimin hangi kanatta olduğu', source: 'oda', who: () => mem('g_yk') },
  { key: 'savunma-plani', fact: 'Holdingin savunma planı (zehir hapı, beyaz şövalye hazırlıkları)', source: 'oda', who: () => [...mem('g_exco'), 'sevgi'] },
];
export const leakKey = kind => kind === 0 ? (state.W.dec?.[0] ? 'dec:' + state.W.dec[0].no : 'yk-kapali') : ['yk-kapali', 'nakit-tablosu', 'yk-bolunme', 'savunma-plani'][kind];
export const keyLabel = key => key.startsWith('dec:') ? `"${(state.W.dec || []).find(d => 'dec:' + d.no === key)?.text?.slice(0, 60) || key.slice(4)}" kararı` : (SEED.find(s => s.key === key)?.fact || key);

let seq = 0;
export function K() {
  const w = state.W; if (!w) return null;
  if (!w.know) { w.know = {}; seedKnowledge(); }
  return w.know;
}
export function seedKnowledge() {
  for (const s of SEED) for (const id of new Set(s.who())) if (live(id)) learn(id, { key: s.key, fact: s.fact, source: s.source });
}
export function learn(id, { key, fact, source, truth = true, from = null, spread = 0 }) {
  if (!live(id) || !fact) return null;
  const k = K(), L = k[id] || (k[id] = []);
  key = key || 't:' + String(fact).slice(0, 80);
  if (L.some(x => x.key === key)) return null;
  const f = { id: 'k' + Date.now().toString(36) + (seq++).toString(36), key, fact: String(fact).slice(0, 160), source, t: clkNow(), truth: !!truth, spread, from };
  L.push(f);
  while (L.length > MAXF) {   // önce oda gevezeliği, sonra en eski düşer
    const i = L.findIndex(x => x.source === 'oda');
    L.splice(i >= 0 ? i : 0, 1);
  }
  return f;
}
export const factOf = (id, key) => (state.W?.know?.[id] || []).find(x => x.key === key) || null;
export const knows = (id, key) => !!factOf(id, key)?.truth;
export const knowers = key => Object.keys(state.W?.know || {}).filter(id => live(id) && knows(id, key));

/* ---------- dedikodu yayılımı ---------- */
const relOf = (a, b) => (state.W.rels || []).find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
const CLOSE = /dostluk|flört|sevgili|evli|akıl hocası|gizli ilişki|aşk/i, JEAL = /kıskan|rekabet|düşman|hayranlık/i;
export function spreadChance(A, B, f) {
  let p = 0.04;
  const r = relOf(A, B);
  if (r && CLOSE.test(r.tur || '')) p += 0.30;
  for (const g of state.W.bgroups || []) if (g.members.includes(A) && g.members.includes(B)) p += g.tur === 'dedikodu' ? 0.25 : 0.10;
  if (['fatma', 'mehmet', 'zeynep'].includes(A)) p += 0.12;                                   // binanın dedikodu merkezleri
  if (GROUPS.some(g => g.id !== 'g_genel' && !isRoom(g.id) && g.members.includes(A) && g.members.includes(B))) p += 0.06;
  if (state.W.mole?.ids?.includes(B)) p += 0.15;                                              // köstebekler kulak kabartır
  if (f.from === 'user' || f.source === 'özel') { const l = loyOf(A); p *= l >= 70 ? 0.3 : l < 40 ? 1.5 : 1; }   // sadık olan sırrı saklar
  return Math.min(0.9, p);
}
export function distortChance(A) {
  let p = 0.1;
  if (loyOf(A) < 35) p += 0.2;
  if ((state.W.rels || []).some(r => (r.a === A || r.b === A) && JEAL.test(r.tur || ''))) p += 0.2;
  return Math.min(0.6, p);
}
const TWISTS = ['üstelik bunun bilerek yapıldığı söyleniyor', 've işin içinde para olduğu konuşuluyor', 'ama asıl planın bambaşka olduğu fısıldanıyor', 've Başkan\'ın bundan haberi olmadığı iddia ediliyor'];
export function spreadDay() {
  const k = K(); if (!k) return [];
  const out = [];
  const people = state.S.agents.filter(a => live(a.id) && a.grp !== 'rival').map(a => a.id);
  const known = new Set(Object.values(k).flat().map(f => f.id));   // günde en fazla bir el: bugün duyulan yarın anlatılır
  for (const A of people) {
    const facts = (k[A] || []).filter(f => known.has(f.id) && f.spread < MAXHOP && (WEIGHT[f.source] || 1) >= 2);
    if (!facts.length) continue;
    facts.sort((x, y) => (WEIGHT[y.source] || 1) - (WEIGHT[x.source] || 1) || y.t - x.t);
    const f = facts[0]; let n = 0;
    for (const B of people) {
      if (B === A || n >= 2 || factOf(B, f.key)) continue;
      if (Math.random() >= spreadChance(A, B, f)) continue;
      const bent = f.truth && Math.random() < distortChance(A);
      const r = applyAction({ type: 'rumor', by: A, to: B, key: f.key, ...(bent ? { truth: false, fact: `${f.fact} (${TWISTS[Math.floor(Math.random() * TWISTS.length)]})` } : {}) });
      if (r.ok) { out.push({ from: A, to: B, key: f.key, truth: r.result.truth }); n++; }
    }
  }
  return out;
}

/* ---------- eylem türleri ---------- */
const who = id => id === 'user' ? (isBoss() ? 'Başkan' : meRole().short) : fnm(agent(id)?.name) || id;
registerAction('leak', {   // {by:'user'|ajan, key?|fact?, to:'basın'|ajan}
  validate: a => (a.by !== 'user' && !live(a.by)) ? 'sızdıran bulunamadı' : (!a.key && !a.fact) ? 'sızan bilgi yok'
    : (a.key && a.by !== 'user' && !factOf(a.by, a.key)) ? 'bilmediği bilgiyi sızdıramaz' : (a.to && a.to !== 'basın' && !live(a.to)) ? 'alıcı bulunamadı' : null,
  apply: a => {
    const key = a.key || 't:' + String(a.fact).slice(0, 80), fact = a.fact || factOf(a.by, a.key)?.fact || keyLabel(key);
    const e = { by: a.by, key, to: a.to || 'basın', t: clkNow() };
    state.W.leakLog = [...(state.W.leakLog || []), e].slice(-30);
    for (const id of e.to === 'basın' ? ['ece'] : [e.to]) learn(id, { key, fact, source: 'sızıntı', from: a.by, spread: 1 });
    return e;
  },
});
registerAction('rumor', {  // {by, to, key, truth?, fact?}: by'ın bildiği bir şeyi to'ya aktarır (çarpıtabilir)
  validate: a => !live(a.by) || !live(a.to) ? 'ajan bulunamadı' : a.by === a.to ? 'kendine dedikodu olmaz' : !factOf(a.by, a.key) ? 'bilmediği şeyi anlatamaz' : factOf(a.to, a.key) ? 'zaten biliyor' : null,
  apply: a => { const f = factOf(a.by, a.key); return learn(a.to, { key: f.key, fact: a.fact || f.fact, source: 'dedikodu', truth: a.truth ?? f.truth, from: a.by, spread: f.spread + 1 }); },
});
registerAction('ally', {   // {a, b, tur, not}: ilişki/ittifak; setRel ile aynı kurallar
  validate: a => typeof a.a !== 'string' || typeof a.b !== 'string' ? 'a ve b ajan kimliği olmalı' : null,
  apply: x => {
    setRel({ a: x.a, b: x.b, tur: x.tur, not: x.not });
    const r = relOf(x.a, x.b);
    if (r) { const fact = `${who(r.a)} ile ${who(r.b)} arasında: ${r.tur}${r.not ? ' (' + r.not + ')' : ''}`; for (const id of [r.a, r.b]) learn(id, { key: 'rel:' + r.k + ':' + r.tur, fact, source: 'ilişki' }); }
    return r || null;
  },
});
registerAction('resign', { // {by, reason}: ajan istifa eder
  validate: a => !live(a.by) ? 'ajan bulunamadı' : agent(a.by).grp === 'rival' ? 'karşı taraf istifa edemez' : null,
  apply: a => {
    const ag = agent(a.by), org = state.W.org || (state.W.org = { fired: [], mem: {} });
    if (!org.fired.includes(a.by)) org.fired.push(a.by);
    const ev = `${ag.name} (${ag.role}) istifa etti${a.reason ? ': ' + String(a.reason).slice(0, 100) : ''}.`;
    news(ev); state.W.backDue = ev; applyOrg(); saveW(); renderHudBar(); refresh();
    return { by: a.by };
  },
});

/* ---------- bilgi kaynakları (kancalar) ---------- */
function hear(chat, m) {
  if (!state.W || !m || m.act || m.who === 'gm' || !String(m.text || '').trim()) return;
  const txt = String(m.text).trim().slice(0, 110);
  if (isBack(chat)) {
    for (const id of backIds(chat)) if (id !== m.who) learn(id, { fact: `${who(m.who)} sana yazdı: "${txt}"`, source: 'özel', from: m.who });
  } else if (isGroup(chat)) {
    for (const id of (m.pr || presentOf(chat))) if (id !== m.who) learn(id, { fact: `${who(m.who)} (${chatName(chat)}): "${txt}"`, source: 'oda', from: m.who });
  } else if (!isChan(chat) && m.who === 'user') {
    learn(chat, { fact: `${who('user')} sana özelden: "${txt}"`, source: 'özel', from: 'user' });
  }
}
on('messagePushed', ({ chat, m }) => { if (m && m.text) hear(chat, m); }, 30);
on('agentMessageDone', ({ chat, m }) => hear(chat, m));                 // akışla gelen ajan mesajları tamamlanınca
on('docAdded', ({ doc }) => learn(doc.from, { key: 'doc:' + doc.id, fact: `Belge: ${doc.title}`, source: 'belge' }));
on('decisionRecorded', ({ d }) => {
  const ids = new Set([...mem('g_yk'), ...mem('g_exco'), ...(isGroup(state.current) ? presentOf(state.current) : [])]);
  for (const id of ids) learn(id, { key: 'dec:' + d.no, fact: `Karar ${d.no}: ${d.text}`, source: 'karar' });
});
on('gameStarted', () => {
  if (!state.W) return; state.W.know = {}; state.W.leakLog = []; seedKnowledge();
  for (const id of state.W.mole?.ids || []) if (![0, 1, 2, 3].some(k => knows(id, leakKey(k)))) {   // köstebek en az bir şeye erişmiş olmalı
    const s = SEED[Math.floor(Math.random() * SEED.length)]; learn(id, { key: s.key, fact: s.fact, source: 'kulis' });
  }
}, 25);
on('time:newDay', () => spreadDay(), 95);

/* ---------- ajan istemi: bildiklerin / yanlış bildiklerin ---------- */
addFilter('ctxExtra', (s, a) => {
  if (!ensure() || a.id === 'gm') return s;
  const L = K()?.[a.id] || []; if (!L.length) return s;
  const line = f => `- ${f.fact} [${SRC[f.source] || f.source}${f.from && f.from !== 'user' && f.from !== a.id ? ', ' + who(f.from) : ''}]`;
  const tr = L.filter(f => f.truth), imp = tr.filter(f => (WEIGHT[f.source] || 1) >= 2).slice(-6), oda = tr.filter(f => f.source === 'oda').slice(-2);
  const fl = L.filter(f => !f.truth).slice(-3);
  if (imp.length || oda.length) s += `\nBİLDİKLERİN (yalnızca bunları ve kendi gördüklerini bilirsin; kimden duyduğunu hatırla, aktarıp aktarmamak karakterine kalmış):\n${[...imp, ...oda].map(line).join('\n')}`;
  if (fl.length) s += `\nYANLIŞ BİLDİKLERİN (sana çarpıtılarak ulaştı ama sen doğru sanıyorsun; buna inanarak konuş, kesin karşı kanıt görürsen düzelt):\n${fl.map(line).join('\n')}`;
  return s;
}, 70);

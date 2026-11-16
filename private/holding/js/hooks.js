/* ================= Kancalar (genişletme noktaları) =================
   Hiçbir modül başka bir modülün fonksiyonunu yeniden atamaz; bunun yerine:
   - on(olay, fn, sıra)            : olay dinleyicisi (emit ile tetiklenir)
   - addFilter(ad, fn, sıra)       : değer süzgeci (applyFilters ile; fn(değer,...argümanlar) => yeni değer | undefined)
   - use(ad, fn, sıra)             : ara katman (runMiddleware ile; fn(...argümanlar, next) — next(...) çağrılmazsa zincir durur)
   Sıra küçükten büyüğe çalışır; eşit sırada kayıt sırası korunur. Her dinleyici kendi try/catch'i içinde çalışır. */
const H = {}, F = {}, MW = {};
const add = (tbl, name, fn, order) => { const l = tbl[name] || (tbl[name] = []); l.push({ fn, order }); l.sort((a, b) => a.order - b.order); return () => { const i = l.findIndex(x => x.fn === fn); if (i >= 0) l.splice(i, 1); }; };
export const on = (evt, fn, order = 50) => add(H, evt, fn, order);
export const addFilter = (name, fn, order = 50) => add(F, name, fn, order);
export const use = (name, fn, order = 50) => add(MW, name, fn, order);
export function emit(evt, payload) {
  for (const h of (H[evt] || []).slice()) { try { h.fn(payload); } catch (e) { console.error(`[kanca ${evt}]`, e); } }
}
export function applyFilters(name, value, ...args) {
  for (const h of (F[name] || []).slice()) { try { const r = h.fn(value, ...args); if (r !== undefined) value = r; } catch (e) { console.error(`[süzgeç ${name}]`, e); } }
  return value;
}
export function runMiddleware(name, final, ...args) {
  const list = (MW[name] || []).slice();
  const step = (i, ...a) => i < list.length ? list[i].fn(...a, (...b) => step(i + 1, ...b)) : final(...a);
  return step(0, ...args);
}
// Hata ayıklama: kayıtlı kancaların dökümü
export const listHooks = () => ({
  events: Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.length])),
  filters: Object.fromEntries(Object.entries(F).map(([k, v]) => [k, v.length])),
  middleware: Object.fromEntries(Object.entries(MW).map(([k, v]) => [k, v.length])),
});

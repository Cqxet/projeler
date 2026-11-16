import {scheduleTask} from './actions.js';
import {emit} from './hooks.js';
import {agent,state} from './state.js';
/* ================= Ajan eylemleri: doğrulanmış, yapılandırılmış eylem nesneleri =================
   Tek giriş noktası: applyAction({type, ...}) → {ok:true, result} | {ok:false, error}
   Türler registerAction(type, {validate, apply}) ile kaydedilir; validate hata metni (string) ya da null döndürür.
   Başarılı her eylemden sonra 'action' olayı yayılır: {action, result}.
   Çekirdek tür: 'task' — modelin [EYLEM: saniye | iş | oda] etiketi (etiket biçimi değişmedi; runAgent bunu buraya yönlendirir).
   Özellikler (features/knowledge.js): 'leak', 'rumor', 'ally', 'resign'. */
const REG = {};
export function registerAction(type, handler) { REG[type] = handler; }
export const actionTypes = () => Object.keys(REG);
export function applyAction(action) {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return { ok: false, error: 'geçersiz eylem nesnesi' };
  const h = REG[action.type];
  if (!h) return { ok: false, error: 'bilinmeyen eylem türü: ' + action.type };
  if (!state.W) return { ok: false, error: 'oyun başlamadı' };
  const err = h.validate ? h.validate(action) : null;
  if (err) return { ok: false, error: err };
  const result = h.apply(action);
  emit('action', { action, result });
  return { ok: true, result };
}

registerAction('task', {
  validate: a => !agent(a.by) ? 'ajan bulunamadı: ' + a.by : !String(a.desc || '').trim() ? 'iş tanımı boş' : null,
  apply: a => scheduleTask(agent(a.by), a.sn, a.desc, a.yer, a.origin),
});

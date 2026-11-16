import {extraHud} from './extras.js';
import {nextTurn,triggerCrisis} from './game.js';
import {gmTick} from './gm.js';
import {emit} from './hooks.js';
import {hireNew,hrAction,hrHud} from './hr.js';
import {$,esc} from './lib/util.js';
import {openNg} from './newgame.js';
import {agent,state} from './state.js';
/* ================= Holding paneli ================= */
export function openHud(){if(!state.W){openNg();return}renderHud();$('pnl').classList.add('open')}
export function renderHud(){
  const h=state.W.hud,f=h.finans,y=h.yk, ic={r:'🔴',y:'🟡',g:'🟢'};
  const kv=(k,v)=>`<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>`;
  $('pnlp').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">🏢 Soylu Holding · ${esc(h.tarih)}</b><button class="ib" id="px">✕</button></div>
  <div class="r2" style="margin-top:10px"><button class="btn g" id="pc">⚡ Kriz tetikle</button><button class="btn g" id="pt">⏭ Yeni çeyrek</button></div>
  <button class="btn" id="pu" style="width:100%;margin-top:8px">🔄 Paneli şimdi güncelle</button>
  <button class="btn" id="pb" style="width:100%;margin-top:8px">🕵 Perde arkasını şimdi çalıştır (ajanlar kendi aralarında yazışsın)</button>
  <div class="r2" style="margin-top:8px"><button class="btn" id="po">🎁 Fırsat tetikle</button><button class="btn" id="pl">💘 İlişkileri ilerlet</button></div>
  <button class="btn" id="plv" style="width:100%;margin-top:8px">💌 Biri bana aşkını ilan etsin</button>
  <button class="btn" id="pk" style="width:100%;margin-top:8px">📜 YK karar taslağı üret</button>
  <h3>Piyasa & finans</h3>${kv('Piyasa değeri',f.piyasa)}${kv('Hisse',f.hisse)}${kv('Serbest nakit',f.nakit)}${kv('Net borç / FAVÖK',f.borc)}${kv('Kredi notu',f.rating)}${kv('30 gün acil nakit',f.acil)}
  <h3>Yönetim Kurulu (9 sandalye)</h3>
  <div class="bar9"><div style="flex:${y.sen};background:#00a884">${y.sen}</div><div style="flex:${y.muhalif};background:#ff6b6b">${y.muhalif}</div><div style="flex:${y.kararsiz};background:#f5a623">${y.kararsiz}</div></div>
  <div class="mut">🟢 Başkan kanadı · 🔴 Muhalif · 🟠 Kararsız</div>
  <h3>İştirakler</h3>${h.istirakler.map(i=>`<div class="kv"><span>${ic[i.d]||'⚪'} ${esc(i.ad)}</span><span>${esc(i.n)}</span></div>`).join('')}
  <h3>İtibar & regülasyon</h3>${kv('Medya',h.itibar.medya)}${kv('SPK / hukuk',h.itibar.spk)}${kv('Ankara',h.itibar.ankara)}
  <h3>Masadaki krizler</h3>${h.krizler.length?h.krizler.map(k=>`<div class="crisis">🚨 ${esc(k)}</div>`).join(''):'<div class="mut">Açık kriz yok.</div>'}
  ${hrHud()}${extraHud()}<h3>Bilinen gelişmeler</h3>${(state.W.chron||[]).slice(-8).reverse().map(c=>`<div class="ch">• ${esc(c)}</div>`).join('')}`;
  $('pnlp').querySelectorAll('[data-hr]').forEach(bt=>bt.onclick=()=>{
    const k=bt.dataset.hr,id=bt.dataset.id,sc=$('pnl').scrollTop,sp=$('pnlp').scrollTop;
    if(k==='fire'&&!confirm(agent(id).name+' işten çıkarılsın mı?'))return;
    hrAction(k,id); renderHud(); $('pnl').scrollTop=sc; $('pnlp').scrollTop=sp;
  });
  if($('hr_go'))$('hr_go').onclick=()=>{const e=hireNew({name:$('hr_n').value,role:$('hr_r').value,g:$('hr_g').value,gid:$('hr_gr').value,desc:$('hr_d').value,secret:$('hr_s').value});if(e)$('hr_msg').textContent=e;else renderHud()};
  $('px').onclick=()=>$('pnl').classList.remove('open'); $('pc').onclick=triggerCrisis; $('pt').onclick=nextTurn;
  $('pu').onclick=async()=>{$('pu').textContent='Güncelleniyor…';await gmTick('Kullanıcı paneli yenilemek istedi.');renderHud()};
  emit('afterRenderHud');
}

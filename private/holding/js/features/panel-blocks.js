import {isBoss} from '../data.js';
import {occ} from './calendar.js';
import {consequences,promResolve,recordDec} from './decisions.js';
import {showDoc} from './documents.js';
import {acil,borcX,ensure,faizM,favok,nextVade,sync} from './finance.js';
import {leakCheck} from './leak.js';
import {gmTick} from '../gm.js';
import {applyFilters,on} from '../hooks.js';
import {clamp,day,fx} from '../lib/num.js';
import {$,esc} from '../lib/util.js';
import {gmNote,kvh,lbl,loyAdd,news} from '../lib/world.js';
import {renderHud} from '../panel.js';
import {agent,fnm,saveW,state} from '../state.js';
import {clkNow,refresh,renderHudBar} from '../ui-list.js';
import {sysNote} from '../ui-messages.js';
import {snap} from '../undo.js';
/* ================= Panel blokları: 📊 paneline finans/takvim/karar/söz/belge bölümleri ve 💰 kısayolu ================= */
/* ---------- panel: finans, takvim, kararlar, sözler, belgeler ---------- */
export function act(kind){
  if(!isBoss()){sysNote('Bu işlem sadece Yönetim Kurulu Başkanı\'nın yetkisinde.');return}
  const F=state.W.fin,amt=Math.abs(parseFloat($('rx_amt')?.value))||0;
  if(amt<=0)return;
  let txt,ok=true;
  if(kind==='temettu'){if(F.nakit<amt){sysNote('Nakit yetersiz.');return}snap('Temettü');F.nakit-=amt;F.lastTemettu=day(clkNow());txt=`Temettü dağıtımı: ${amt} M₺ ödendi.`;loyAdd('kerem',4);loyAdd('orhan',3);loyAdd('tolga',3);leakCheck(txt)}
  else if(kind==='borc'){const a=Math.min(amt,F.borc);if(F.nakit<a){sysNote('Nakit yetersiz.');return}snap('Borç ödeme');F.nakit-=a;F.borc-=a;txt=`Borç ödemesi: ${a} M₺ kapatıldı.`;loyAdd('cem',4);loyAdd('aylin',2)}
  else if(kind==='kredi'){snap('Yeni kredi');F.nakit+=amt*.99;F.borc+=amt;F.faiz=clamp(F.faiz+.3,4,18);txt=`Yeni kredi: ${amt} M₺ kullanıldı (%1 masraf, borçlanma maliyeti %${fx(F.faiz,1)}).`;loyAdd('cem',1);loyAdd('aylin',-1)}
  else if(kind==='varlik'){snap('Varlık satışı');F.nakit+=amt*.85;F.favok0-=amt*.05;txt=`Varlık satışı: ${amt} M₺ değerinde varlık %15 iskontoyla satıldı.`;loyAdd('hatice',-2);loyAdd('ali',-2);loyAdd('emre',-2);leakCheck(txt)}
  sync();
  gmNote('g_exco','💼 '+txt);news(txt);state.W.backDue=txt;
  recordDec(txt,true);renderHudBar();refresh();saveW();
  if(state.S.model&&state.S.autoHud)gmTick('Başkan finansal bir hamle yaptı: '+txt);
  consequences(txt);
}
export function panelHtml(){
  const F=state.W.fin,boss=isBoss(),dis=boss?'':'disabled';
  const dayN=day(clkNow()),nextClose=(Math.floor(clkNow()/43200)+1)*43200-clkNow();
  let h=`<h3 id="rx_top">💰 Finans modeli</h3>`+
    kvh('Nakit',fx(F.nakit)+' M₺')+kvh('Toplam borç',fx(F.borc)+' M₺')+kvh('Net borç / FAVÖK',fx(borcX(),1)+'x')+kvh('FAVÖK (yıllık)',fx(favok())+' M₺')+
    kvh('Borçlanma maliyeti','%'+fx(F.faiz,1))+kvh('Aylık faiz gideri',fx(faizM(),1)+' M₺')+kvh('Son ay net nakit',F.lastNet===null?'(henüz kapanış yok)':(F.lastNet>=0?'+':'')+fx(F.lastNet,1)+' M₺')+
    kvh('30 gün acil ihtiyaç',fx(acil())+' M₺')+kvh('Sonraki ay kapanışı',fx(nextClose/1440,0)+' gün sonra')+kvh('Sonraki kredi taksiti',lbl(nextVade()));
  h+=`<div class="r2" style="margin-top:8px"><input id="rx_amt" type="number" min="1" value="120"><span class="mut" style="flex:0 0 30px;align-self:center">M₺</span></div>
  <div class="r2" style="margin-top:6px"><button class="btn" data-rx="temettu" ${dis}>💸 Temettü dağıt</button><button class="btn" data-rx="borc" ${dis}>🏦 Borç öde</button></div>
  <div class="r2" style="margin-top:6px"><button class="btn" data-rx="kredi" ${dis}>➕ Yeni kredi</button><button class="btn" data-rx="varlik" ${dis}>🏷 Varlık sat</button></div>
  ${boss?'':'<div class="mut">Finansal hamleler Başkan\'ın yetkisinde.</div>'}`;
  const ev=occ(clkNow(),clkNow()+14*1440).slice(0,8);
  h+=`<h3>📅 Takvim (14 gün)</h3>`+(ev.length?ev.map(e=>`<div class="kv"><span>${lbl(e.t)}</span><span>${esc(e.ad)}</span></div>`).join(''):'<div class="mut">Yakında bir olay yok.</div>')+`<div class="mut">Randevu eklemek için: /randevu 14:30 Cem ile görüşme</div>`;
  h+=`<h3>📒 Karar defteri</h3>`+((state.W.dec||[]).length?(state.W.dec||[]).slice(0,8).map(d=>`<div class="rxrow"><span>${esc(d.no)} · ${esc(d.text)}</span><span class="mut">${esc(d.oy)}</span></div>`).join(''):'<div class="mut">Henüz karar yok. Sohbete /karar <metin> yaz.</div>');
  h+=`<h3>🤝 Verilen sözler</h3>`+((state.W.prom||[]).length?(state.W.prom||[]).slice(0,8).map(p=>`<div class="rxrow"><span>${esc(fnm(agent(p.who)?.name))}: ${esc(p.text)} <span class="mut">${p.st==='open'?'· vade '+lbl(p.due):p.st==='kept'?'· ✔ tutuldu':'· ✖ tutulmadı'}</span></span>${p.st==='open'?`<span><button data-rxp="${p.id}:1">✔ Tuttum</button><button data-rxp="${p.id}:0">✖</button></span>`:''}</div>`).join(''):'<div class="mut">Henüz söz yok. /söz Aylin 30 bütçeyi artıracağım</div>');
  h+=`<h3>📎 Belgeler</h3>`+((state.W.docs||[]).length?(state.W.docs||[]).slice(0,10).map(d=>`<div class="rxrow"><span class="l" data-rxd="${d.id}">📎 ${esc(d.title)}</span><span class="mut">${esc(fnm(agent(d.from)?.name))}</span></div>`).join(''):'<div class="mut">Henüz belge yok; ay kapanışında gelmeye başlar.</div>');
  h=applyFilters('panelBlocks',h);   // özellik blokları: hedefler (10), gizli hat (20), köstebek avı (30)
  if((state.W.pend||[]).length)h+=`<div class="mut" style="margin-top:8px">⏳ Yolda ${(state.W.pend||[]).length} gelişme var (zaman ilerledikçe gerçekleşir).</div>`;
  return h;
}
on('afterRenderHud',()=>{
  try{
    if(!ensure())return;
    const anchor=[...$('pnlp').querySelectorAll('h3')].find(h=>/^Yönetim Kurulu/.test(h.textContent));
    if(anchor)anchor.insertAdjacentHTML('beforebegin',panelHtml());else $('pnlp').insertAdjacentHTML('beforeend',panelHtml());
    const keep=()=>{const a=$('pnl').scrollTop,b=$('pnlp').scrollTop;renderHud();$('pnl').scrollTop=a;$('pnlp').scrollTop=b};
    $('pnlp').querySelectorAll('[data-rx]').forEach(b=>b.onclick=()=>{act(b.dataset.rx);keep()});
    $('pnlp').querySelectorAll('[data-rxp]').forEach(b=>b.onclick=()=>{const [id,v]=b.dataset.rxp.split(':');promResolve(id,v==='1');keep()});
    $('pnlp').querySelectorAll('[data-rxd]').forEach(b=>b.onclick=()=>showDoc(b.dataset.rxd));
  }catch(e){console.error('realism panel',e)}
});

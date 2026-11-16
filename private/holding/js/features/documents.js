import {acil,borcX,faizM} from './finance.js';
import {emit} from '../hooks.js';
import {notify} from '../lib/notify.js';
import {fx} from '../lib/num.js';
import {$,esc} from '../lib/util.js';
import {lbl,live} from '../lib/world.js';
import {agent,state} from '../state.js';
import {clkNow} from '../ui-list.js';
import {pushMsg} from '../ui-messages.js';
/* ---------- belgeler ---------- */
export function addDoc(from,title,body){
  const d={id:'d'+Date.now()+Math.floor(Math.random()*99),from,title,body,t:clkNow()};
  state.W.docs=[d,...(state.W.docs||[])].slice(0,30);
  if(live(from)){pushMsg(from,{who:from,text:`📎 [Belge gönderildi: ${title}]`,t:Date.now()});notify(agent(from).name,'📎 '+title,from)}
  emit('docAdded',{doc:d});
  return d;
}
export function showDoc(id){
  const d=(state.W.docs||[]).find(x=>x.id===id);if(!d)return;
  $('ngc').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">📎 ${esc(d.title)}</b><button class="ib" id="rxx">✕</button></div><div class="mut">${esc(agent(d.from)?.name||'')} · ${lbl(d.t)}</div><div class="rxdoc">${esc(d.body)}</div>`;
  $('ng').classList.add('open');$('rxx').onclick=()=>$('ng').classList.remove('open');
}
export function monthDoc(k){
  const F=state.W.fin;
  return addDoc('deniz',`Aylık Kapanış Raporu · ${k}. ay`,
`SOYLU HOLDİNG A.Ş. · AYLIK KAPANIŞ RAPORU
Dönem: ${k}. ay sonu (${lbl(clkNow())})

İŞTİRAK NAKİT KATKILARI
${(F.lastParts||[]).map(p=>`  ${p.ad}: ${p.v>=0?'+':''}${fx(p.v,1)} M₺`).join('\n')}

Faiz gideri: -${fx(faizM(),1)} M₺
Genel yönetim gideri: -${fx(F.gider,1)} M₺
NET NAKİT HAREKETİ: ${F.lastNet>=0?'+':''}${fx(F.lastNet,1)} M₺

Kapanış nakit: ${fx(F.nakit)} M₺
Toplam borç: ${fx(F.borc)} M₺ · Net borç/FAVÖK: ${fx(borcX(),1)}x
Borçlanma maliyeti: %${fx(F.faiz,1)}
30 gün acil nakit ihtiyacı: ${fx(acil())} M₺

Muhasebe notu: ${F.nakit<acil()?'Nakit, 30 günlük ihtiyacın altında; acil likidite planı önerilir.':'Likidite şu an yeterli.'} Ilişkili taraf kayıtları ay sonu mutabakatından geçmiştir.`);
}

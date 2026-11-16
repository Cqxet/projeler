import {ensure} from './finance.js';
import {gmTick} from '../gm.js';
import {addFilter,emit,on} from '../hooks.js';
import {day} from '../lib/num.js';
import {$} from '../lib/util.js';
import {renderHud} from '../panel.js';
import {saveW,state} from '../state.js';
import {clkStr,refresh,renderHudBar} from '../ui-list.js';
/* ================= Zaman: saat ilerleyince özellikleri sırayla çalıştırır =================
   Çekirdek setClk() → 'timeAdvanced' {from,to}. Burada iki aşamalı olaya çevrilir:
     'time:advance' {from,to,log,months}  her ilerlemede   (finans 10 · takvim 20 · karar sonuçları 30 · sözler 35 · sahneler 40 · kapı 50)
     'time:newDay'  {from,to,log,months}  gün değişince     (ilişki 10 · baskı 20 · köstebek 30 · köstebek-sensin 40 · hedefler 50 · kriz 60 · azil 70 · davet 80 · grup denetimi 90)
   log'a yazılan gelişmeler, model açıksa panel güncellemesi (gmTick) için özetlenir. */
let qj=false;   // yeni çeyrek: bir sonraki saat değişimi 91 gün ileri atlar
addFilter('clockTarget',t=>{if(qj){t+=91*1440;qj=false}return t});
on('beforeNextTurn',()=>{qj=true});
on('afterNextTurn',()=>{qj=false});
on('timeAdvanced',({from,to})=>onTime(from,to));
export function onTime(o,n){
  if(!ensure()||n<=o)return;
  const F=state.W.fin,log=[];
  const mn=Math.floor(n/43200),months=[];for(let k=F.month+1;k<=mn;k++)months.push(k);   // kapanması gereken aylar
  F.month=Math.max(F.month,mn);
  const ctx={from:o,to:n,log,months};
  emit('time:advance',ctx);
  if(day(n)>day(o))emit('time:newDay',ctx);
  saveW();renderHudBar();refresh();
  if(log.length&&state.S.model&&state.S.autoHud)gmTick('Zaman ilerledi ('+clkStr()+'); şu gelişmeler yaşandı: '+log.slice(-4).join(' | ')+'. Panel durumunu tutarlı biçimde güncelle.');
  if($('pnl').classList.contains('open'))renderHud();
}

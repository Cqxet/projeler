import {loyOf} from '../data.js';
import {addDoc} from './documents.js';
import {borcX} from './finance.js';
import {ring} from './ring.js';
import {addFilter,on} from '../hooks.js';
import {day,fx} from '../lib/num.js';
import {esc} from '../lib/util.js';
import {gmNote,live,loyAdd,news} from '../lib/world.js';
import {saveW,state} from '../state.js';
import {clkNow} from '../ui-list.js';
/* ---------- hedefler ve sezon sonu ---------- */
export const avgLoy=ids=>{const l=ids.filter(live);return l.length?l.reduce((s,i)=>s+loyOf(i),0)/l.length:50};
export const TOPX=['murat','aylin','sevgi','kerem','orhan','faruk'];
export function newQuarter(){
  const F=state.W.fin,d=day(clkNow()),g=state.W.goals||(state.W.goals={q:0,season:1,hist:[],score:0});
  g.q++;g.startDay=d;g.endDay=d+90;
  const all=[
    {id:'nakit',t:Math.round(F.nakit*1.12),txt:`Nakdi ${fx(F.nakit*1.12)} M₺ üzerine çıkar`},
    {id:'hisse',t:Math.round(F.hisse*1.08*100)/100,txt:`Hisseyi ${fx(F.hisse*1.08,2)} TL üzerine taşı`},
    {id:'borc',t:Math.max(1.2,Math.round((borcX()-.3)*10)/10),txt:`Net borç/FAVÖK oranını ${fx(Math.max(1.2,borcX()-.3),1)}x altına indir`},
    {id:'sadakat',t:Math.min(75,Math.round(avgLoy(TOPX))+6),txt:`Üst yönetimin sana ortalama sadakatini ${Math.min(75,Math.round(avgLoy(TOPX))+6)} üzerine çıkar`},
    {id:'kriz',t:1,txt:'Açık kriz sayısını en fazla 1\'de tut'},
    {id:'temettu',t:d,txt:'Hissedarlara temettü dağıt (panelden)'},
  ];
  const pool=all.filter(x=>!(x.id==='kriz'&&(state.W.hud.krizler||[]).length<=1&&false));
  g.items=pool.sort(()=>Math.random()-.5).slice(0,3);
  gmNote('g_genel',`🎯 ${g.season}. sezon, ${((g.q-1)%4)+1}. çeyrek hedefleri: ${g.items.map(i=>i.txt).join(' · ')}`);
  saveW();
}
export function goalOk(i){
  const F=state.W.fin;
  switch(i.id){
    case'nakit':return F.nakit>=i.t;
    case'hisse':return F.hisse>=i.t;
    case'borc':return borcX()<=i.t;
    case'sadakat':return avgLoy(TOPX)>=i.t;
    case'kriz':return (state.W.hud.krizler||[]).length<=i.t;
    case'temettu':return F.lastTemettu!==null&&F.lastTemettu>=state.W.goals.startDay;
  }
  return false;
}
export function closeQuarter(){
  const g=state.W.goals,res=g.items.map(i=>({txt:i.txt,ok:goalOk(i)})),done=res.filter(r=>r.ok).length,tot=res.length;
  g.score+=done*10;g.hist.push({q:g.q,done,tot});
  const nb=`Çeyrek karnesi: ${done}/${tot} hedef tutturuldu.`;news(nb);state.W.chron.push(nb);
  addDoc('tolga',`${g.season}. sezon ${((g.q-1)%4)+1}. çeyrek hedef karnesi`,`ÇEYREK HEDEF KARNESİ\n\n${res.map(r=>`${r.ok?'✔':'✖'} ${r.txt}`).join('\n')}\n\nSonuç: ${done}/${tot} hedef · Toplam puan: ${g.score}\n\nYatırımcı İlişkileri · Tolga Başar`);
  const d=done>=2?2:-2;['murat','kerem','orhan','sevgi'].forEach(i=>loyAdd(i,d));
  gmNote('g_genel',`📊 ${nb} Puan: ${g.score}.`);
  if(g.q%4===0){   // sezon sonu
    const tot2=g.hist.slice(-4).reduce((s,h)=>s+h.tot,0),done2=g.hist.slice(-4).reduce((s,h)=>s+h.done,0),r=done2/Math.max(1,tot2);
    const grade=r>=.75?'🏆 Yılın Yöneticisi':r>=.5?'👍 Başarılı sezon':'⚠️ Zorlu sezon';
    const txt=`${g.season}. sezon bitti. ${done2}/${tot2} hedef tutturuldu. Karne: ${grade}. Nakit ${fx(state.W.fin.nakit)} M₺, hisse ${fx(state.W.fin.hisse,2)} TL, net borç/FAVÖK ${fx(borcX(),1)}x. Toplam puan: ${g.score}.`;
    news('Sezon sonu: '+txt);
    ring({who:'zeynep',kind:'invite',title:'Sezon sonu karnesi',ok:'Yeni sezona başla',no:'Yeni sezona başla',text:txt,onAnswer:()=>{g.season++;newQuarter()}});
  }else newQuarter();
  saveW();
}
export function goalsTick(n){
  if(!state.W.goals){newQuarter();return}
  if(day(n)>=state.W.goals.endDay)closeQuarter();
}
export const goalsBlock=()=>{const g=state.W.goals;if(!g)return '';return `<h3>🎯 Hedefler · ${g.season}. sezon ${((g.q-1)%4)+1}. çeyrek</h3>`+g.items.map(i=>`<div class="kv"><span>${goalOk(i)?'✔':'⬜'} ${esc(i.txt)}</span><span></span></div>`).join('')+`<div class="kv"><span>Çeyrek sonu</span><span>${Math.max(0,g.endDay-day(clkNow()))} gün sonra</span></div><div class="kv"><span>Puan</span><span>${g.score}</span></div>`};

/* ---------- kancalar ---------- */
on('gameStarted',()=>{if(state.W&&!state.W.goals)newQuarter()},40);
on('time:newDay',({to})=>goalsTick(to),50);
addFilter('panelBlocks',h=>state.W.goals?h+goalsBlock():h,10);

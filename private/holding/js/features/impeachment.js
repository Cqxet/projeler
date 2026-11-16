import {isBoss} from '../data.js';
import {sync} from './finance.js';
import {avgLoy} from './goals.js';
import {isOpp} from './groups.js';
import {ring,ringCur,ringQ} from './ring.js';
import {on} from '../hooks.js';
import {clamp,day} from '../lib/num.js';
import {gmNote,live,loyAdd,news} from '../lib/world.js';
import {saveW,state} from '../state.js';
import {clkNow,refresh,renderHudBar} from '../ui-list.js';
import {sysNote} from '../ui-messages.js';
/* ---------- görevden alma (azil) ---------- */
export function endGame(type,text){
  state.W.ended={type,t:clkNow()};news(text);state.W.chron.push(text);
  gmNote(state.current,'🏁 OYUN SONU — '+text+' Yeni oyun için ⚙️ menüsünden senaryo seç.');
  gmNote('g_genel','🏁 '+text);saveW();renderHudBar();refresh();
}
export function azilCheck(o,n){
  if(state.W.ended||(state.W.you&&(state.W.you.caught||state.W.you.won)))return;
  const gap=Math.min(30,day(n)-day(o));
  state.W.oppDays=isOpp()?(state.W.oppDays||0)+gap:0;
  if(ringCur||ringQ.length)return;
  const y=state.W.hud.yk,boss=isBoss();
  const ready=boss?(state.W.oppDays>=14&&y.muhalif>y.sen):(state.W.oppDays>=21);
  if(!ready||day(n)-(state.W.azilDay??-99)<20)return;
  state.W.azilDay=day(n);
  const who=boss?(live('murat')?'murat':'kerem'):(live('faruk')?'faruk':'murat');
  const ids=['murat','kerem','orhan','sevgi','faruk'];
  const text=boss?`Muhalif üyeler olağanüstü YK toplantısı istedi: Başkanlıktan azil oylaması gündemde. Sayım: sen ${y.sen}, karşı ${y.muhalif}, kararsız ${y.kararsiz}. Nasıl karşılıyorsun?`
    :`Üst yönetim performansını ve sadakatini sorguluyor; görevinden alınman gündemde. Savunmanı nasıl yapacaksın?`;
  const opts=boss?['Üyelerle tek tek görüş, söz ver','Taviz paketi: temettü ve kadro sözü (-80 M₺)','Doğrudan oylamaya gir','İstifa et']
    :['Hatalarımı kabul edip hedef söz ver','Yeni bir projeyle kendimi kanıtla','Kendi isteğimle ayrılıyorum'];
  ring({who,kind:'scene',title:boss?'⚖️ Azil oylaması':'⚖️ Görevden alma görüşmesi',text,opts,def:opts.length-1,
    onAnswer:i=>{
      if(i===opts.length-1){endGame('istifa',boss?'Başkanlıktan istifa ettin; Soylu Holding\'in yönetimi muhaliflerin eline geçti.':'Görevinden ayrıldın; kariyerin Soylu Holding\'de sona erdi.');return}
      let bonus=0;
      if(boss){
        if(i===0){bonus=.15;['murat','kerem','orhan','sevgi'].forEach(x=>loyAdd(x,4))}
        else if(i===1){if(state.W.fin.nakit>=80){state.W.fin.nakit-=80;sync();bonus=.3;['murat','kerem','orhan','sevgi'].forEach(x=>loyAdd(x,8))}else{bonus=.05;sysNote('Taviz paketi için nakit yetmedi.')}}
        const al=avgLoy(['murat','kerem','orhan','sevgi']),pA=clamp((100-al)/100-bonus,.05,.95);
        const against=y.muhalif-Math.round(y.muhalif*bonus*.5)+Math.round(y.kararsiz*pA);   // ikna edilen muhalifler de oy değiştirebilir
        if(against>=5)endGame('azil',`YK ${against}-${9-against} oyla seni Başkanlıktan azletti.`);
        else{y.muhalif=Math.max(0,y.muhalif-1);y.sen=Math.min(9,y.sen+1);state.W.oppDays=0;state.W.oppStrikes=0;state.W.excl=[];
          news(`Başkan azil oylamasını ${9-against}-${against} kazandı; muhalefet geri çekildi.`);gmNote(state.current,`✅ Azil oylamasını atlattın (${9-against}-${against}).`);saveW();renderHudBar()}
      }else{
        bonus=i===0?8:i===1?14:0;
        const al=avgLoy(['faruk','murat','aylin','sevgi'])+bonus;
        if(al<45)endGame('azil','Üst yönetim görevine son verdi; Soylu Holding\'den ayrıldın.');
        else{state.W.oppDays=0;ids.forEach(x=>loyAdd(x,3));news('Yönetim, görevden alma kararından vazgeçti; sana bir şans daha verildi.');gmNote(state.current,'✅ Görevde kalmana karar verildi; ama gözler üzerinde.');saveW()}
      }
    }});
}

/* ---------- kancalar ---------- */
on('time:newDay',({from,to})=>azilCheck(from,to),70);

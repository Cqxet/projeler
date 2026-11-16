import {enterRoom} from './ai-core.js';
import {$} from './lib/util.js';
import {stopListening} from './mic.js';
import {openHud} from './panel.js';
import {openCfg} from './settings.js';
import {ctrls,group,isGroup,saveS,state} from './state.js';
import {stopSpeech} from './tts.js';
import {clkNow,clkStr,refresh,setClk} from './ui-list.js';
import {sysNote} from './ui-messages.js';
/* ================= Üst butonlar ================= */
export function initTopbar(){
$('vbtn').onclick=()=>{state.S.voiceOn=!state.S.voiceOn;saveS();if(!state.S.voiceOn)stopSpeech();refresh()};
$('stop').onclick=()=>{state.chainGen++;ctrls.forEach(c=>c.abort());stopSpeech();stopListening()};
$('back').onclick=()=>document.body.classList.remove('inchat');
$('callall').onclick=()=>{if(isGroup(state.current))enterRoom(state.current,group(state.current).members)};
(()=>{ // saat ilerletme menüsü
  const menu=$('clkmenu'), btn=$('clkbtn');
  const toTime=(h,m=0)=>{const d=Math.floor(clkNow()/1440)*1440,t=d+h*60+m;return t<=clkNow()?t+1440:t};
  const opts=[['+30 dakika',()=>clkNow()+30],['+1 saat',()=>clkNow()+60],['+3 saat',()=>clkNow()+180],['Mesai sonu (18:00)',()=>toTime(18)],['Ertesi sabah (09:00)',()=>toTime(9)],['+1 gün',()=>clkNow()+1440]];
  const close=()=>{menu.style.display='none'};
  btn.onclick=e=>{
    e.stopPropagation(); if(!state.W)return;
    if(menu.style.display==='block')return close();
    menu.innerHTML=`<div class="mut">🕐 ${clkStr()}</div>`+opts.map((o,i)=>`<button data-i="${i}">${o[0]}</button>`).join('');
    const r=btn.getBoundingClientRect(); menu.style.top=r.bottom+6+'px'; menu.style.right=Math.max(8,innerWidth-r.right)+'px'; menu.style.display='block';
    menu.querySelectorAll('button').forEach(b=>b.onclick=ev=>{ev.stopPropagation();setClk(opts[+b.dataset.i][1]());close();if(typeof sysNote==='function')sysNote('🕐 Saat '+clkStr()+' oldu.')});
  };
  document.addEventListener('click',close);
})();
$('gear').onclick=()=>openCfg(); $('pbtn').onclick=()=>openHud(); $('hudbar').onclick=()=>openHud();
for(const id of ['cfg','pnl','ng'])$(id).onclick=e=>{if(e.target===$(id))$(id).classList.remove('open')};
}

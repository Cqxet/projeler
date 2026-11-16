import {armTask,renderTasks,taskTimers} from './actions.js';
import {$,jset} from './lib/util.js';
import {stopListening,syncAct} from './mic.js';
import {agent,applyOrg,ctrls,elOf,isBack,isChan,isGroup,saveW,snaps,state} from './state.js';
import {stopSpeech} from './tts.js';
import {openChat,renderHudBar} from './ui-list.js';
/* ================= Geri al (roll back) ================= */
// Her mesaj/olay öncesi durumun (sohbetler + dünya) kopyası alınır; ↩ son kopyaya döner.
export function snap(label,extra){
  if(!state.W)return;
  snaps.push({label,t:Date.now(),M:JSON.stringify(state.M),W:JSON.stringify(state.W),...(extra||{})});
  if(snaps.length>15)snaps.shift();
  updateUndo();
}
export function updateUndo(){
  const b=$('undo'); if(!b)return; const s=snaps[snaps.length-1];
  b.style.opacity=s?1:.3;
  b.title=s?`Geri al (${snaps.length}): ${s.text?'"'+s.text.slice(0,40)+'" mesajını ve cevapları sil':s.label+' öncesine dön'}`:'Geri alınacak bir şey yok';
}
export function rollback(){
  const s=snaps.pop(); if(!s){return}
  state.epoch++; state.chainGen++;                                   // uçuştaki her şey geçersiz
  ctrls.forEach(c=>c.abort()); ctrls.clear(); stopSpeech(); stopListening();
  taskTimers.forEach(t=>clearTimeout(t)); taskTimers.clear();
  clearTimeout(state.tickTimer); state.typing={}; state.backBusy=false; state.ticking=false;
  state.M=JSON.parse(s.M); state.W=JSON.parse(s.W); applyOrg();
  saveW(); jset('hold_m',state.M);
  elOf.clear(); (state.W.tasks||[]).forEach(armTask);
  renderHudBar(); renderTasks();
  openChat(s.chat&&(isGroup(s.chat)||agent(s.chat)||isBack(s.chat)||isChan(s.chat))?s.chat:state.current);
  if(s.text){$('text').value=s.text;syncAct();$('text').focus()}   // mesajı düzenleyip yeniden gönderebil
  updateUndo();
}
export function initUndo(){
$('undo').onclick=()=>rollback();
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){e.preventDefault();rollback()}
});
}

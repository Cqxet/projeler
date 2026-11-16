/* ================= Geri al (roll back) ================= */
// Her mesaj/olay öncesi durumun (sohbetler + dünya) kopyası alınır; ↩ son kopyaya döner.
function snap(label,extra){
  if(!W)return;
  snaps.push({label,t:Date.now(),M:JSON.stringify(M),W:JSON.stringify(W),...(extra||{})});
  if(snaps.length>15)snaps.shift();
  updateUndo();
}
function updateUndo(){
  const b=$('undo'); if(!b)return; const s=snaps[snaps.length-1];
  b.style.opacity=s?1:.3;
  b.title=s?`Geri al (${snaps.length}): ${s.text?'"'+s.text.slice(0,40)+'" mesajını ve cevapları sil':s.label+' öncesine dön'}`:'Geri alınacak bir şey yok';
}
function rollback(){
  const s=snaps.pop(); if(!s){return}
  epoch++; chainGen++;                                   // uçuştaki her şey geçersiz
  ctrls.forEach(c=>c.abort()); ctrls.clear(); stopSpeech(); stopListening();
  taskTimers.forEach(t=>clearTimeout(t)); taskTimers.clear();
  clearTimeout(tickTimer); typing={}; backBusy=false; ticking=false;
  M=JSON.parse(s.M); W=JSON.parse(s.W); applyOrg();
  saveW(); jset('hold_m',M);
  elOf.clear(); (W.tasks||[]).forEach(armTask);
  renderHudBar(); renderTasks();
  openChat(s.chat&&(isGroup(s.chat)||agent(s.chat)||isBack(s.chat)||isChan(s.chat))?s.chat:current);
  if(s.text){$('text').value=s.text;syncAct();$('text').focus()}   // mesajı düzenleyip yeniden gönderebil
  updateUndo();
}
$('undo').onclick=()=>rollback();
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){e.preventDefault();rollback()}
});

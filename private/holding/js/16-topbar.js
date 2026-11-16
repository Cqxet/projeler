/* ================= Üst butonlar ================= */
$('vbtn').onclick=()=>{S.voiceOn=!S.voiceOn;saveS();if(!S.voiceOn)stopSpeech();refresh()};
$('stop').onclick=()=>{chainGen++;ctrls.forEach(c=>c.abort());stopSpeech();stopListening()};
$('back').onclick=()=>document.body.classList.remove('inchat');
$('callall').onclick=()=>{if(isGroup(current))enterRoom(current,group(current).members)};
(()=>{ // saat ilerletme menüsü
  const menu=$('clkmenu'), btn=$('clkbtn');
  const toTime=(h,m=0)=>{const d=Math.floor(clkNow()/1440)*1440,t=d+h*60+m;return t<=clkNow()?t+1440:t};
  const opts=[['+30 dakika',()=>clkNow()+30],['+1 saat',()=>clkNow()+60],['+3 saat',()=>clkNow()+180],['Mesai sonu (18:00)',()=>toTime(18)],['Ertesi sabah (09:00)',()=>toTime(9)],['+1 gün',()=>clkNow()+1440]];
  const close=()=>{menu.style.display='none'};
  btn.onclick=e=>{
    e.stopPropagation(); if(!W)return;
    if(menu.style.display==='block')return close();
    menu.innerHTML=`<div class="mut">🕐 ${clkStr()}</div>`+opts.map((o,i)=>`<button data-i="${i}">${o[0]}</button>`).join('');
    const r=btn.getBoundingClientRect(); menu.style.top=r.bottom+6+'px'; menu.style.right=Math.max(8,innerWidth-r.right)+'px'; menu.style.display='block';
    menu.querySelectorAll('button').forEach(b=>b.onclick=ev=>{ev.stopPropagation();setClk(opts[+b.dataset.i][1]());close();if(typeof sysNote==='function')sysNote('🕐 Saat '+clkStr()+' oldu.')});
  };
  document.addEventListener('click',close);
})();
$('gear').onclick=()=>openCfg(); $('pbtn').onclick=()=>openHud(); $('hudbar').onclick=()=>openHud();
for(const id of ['cfg','pnl','ng'])$(id).onclick=e=>{if(e.target===$(id))$(id).classList.remove('open')};

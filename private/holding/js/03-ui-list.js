/* ================= Liste & başlık ================= */
const initial=n=>(n||'?').replace(/^(Prof\. Dr\.|Av\.)\s*/,'')[0].toUpperCase();
function avatar(id,cls=''){
  if(isGroup(id)) return `<div class="av ${cls}" style="background:#374248">${group(id).ico}</div>`;
  if(isChan(id)) return `<div class="av ${cls}" style="background:#1f6f5c">${CHANS.find(c=>c.id===id).ico}</div>`;
  if(isBack(id)) return `<div class="av ${cls}" style="background:#4a3b66">${isBg(id)?'🕶':'👁'}</div>`;
  const a=agent(id); return `<div class="av ${cls} ${speakingNow.has(id)?'sp':''}" style="background:${a.color}">${esc(initial(a.name))}</div>`;
}
function typingText(c){const t=typing[c];if(!t||!t.size)return '';return [...t].map(i=>fnm(agent(i)?.name)).filter(Boolean).join(', ')+' yazıyor…'}
function renderList(){
  fixOffice();
  const sec=(t,ids)=>`<div class="gl">${t}</div>`+ids.map(id=>{
    const m=msgs(id), last=m[m.length-1], ty=typingText(id);
    const who=last?(last.who==='user'?'Sen: ':(isGroup(id)||isBack(id))?(fnm(agent(last.who)?.name)||'')+': ':''):'';
    const pv=ty?`<span class="ty">${esc(ty)}</span>`:`<span>${last?esc(who+last.text):(isGroup(id)?'Grup sohbeti':isChan(id)?'Haber kanalı':esc(agent(id).role))}</span>`;
    return `<div class="ci ${id===current?'sel':''}" data-id="${id}">${avatar(id)}<div class="mid"><div class="r1"><span class="nm">${esc(chatName(id))}</span><span class="tm">${last?fmt(last.t):''}</span></div><div class="pv">${pv}${unread[id]?`<span class="bdg">${unread[id]}</span>`:''}</div></div></div>`;
  }).join('');
  const rv=S.agents.filter(a=>a.grp==='rival'&&!fired(a.id));
  const ex=S.agents.filter(a=>a.grp!=='staff'&&a.grp!=='rival'&&!fired(a.id)), st=S.agents.filter(a=>a.grp==='staff'&&!fired(a.id)), ft=S.agents.filter(a=>fired(a.id));
  const bk=S.showBack?Object.keys(M).filter(k=>isBack(k)&&M[k].length).sort((x,y)=>M[y][M[y].length-1].t-M[x][M[x].length-1].t):[];
  $('list').innerHTML=sec('Gruplar',GROUPS.filter(g=>canSee(g.id)).map(g=>g.id))+sec('Kanallar',CHANS.map(c=>c.id))+(bk.length?sec('👁 Perde arkası (sadece sen görürsün)',bk):'')+(rv.length?sec('🦈 Karşı taraf (Borealis Capital)',rv.map(a=>a.id)):'')+sec('Yönetim (özel yazışma)',ex.map(a=>a.id))+sec('Çalışanlar (özel yazışma)',st.map(a=>a.id))+(ft.length?sec('🔴 Ayrılanlar (işten çıkarıldı)',ft.map(a=>a.id)):'');
  $('list').querySelectorAll('.ci').forEach(e=>e.onclick=()=>openChat(e.dataset.id));
}
const DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const clkNow=()=>{if(!W)return 540;if(typeof W.clk!=='number')W.clk=540+Math.floor(Math.random()*120);return W.clk};
const clkHM=()=>{const m=((clkNow()%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const clkStr=()=>`${DAYS[Math.floor(clkNow()/1440)%7]} ${clkHM()}`;
const isOffice=m=>{const h=((m%1440)+1440)%1440;return h>=540&&h<1080};
function setClk(t){
  if(!W)return; const o=clkNow(); W.clk=t;
  const newDay=Math.floor(t/1440)!==Math.floor(o/1440), was=isOffice(o), now=isOffice(t);
  if(was&&!now&&!newDay){   // mesai bitti: herkes ofisten çıkar
    W.present=W.present||{}; GROUPS.forEach(g=>{W.present[g.id]=[]});
    pushMsg('g_genel',{who:'gm',act:true,text:'🌙 Mesai bitti; herkes ofisten ayrıldı. Yazışmalar özelden sürer.',t:Date.now()});
  }else if(now&&(!was||newDay)){   // yeni gün: ofis dolar
    W.present=W.present||{}; GROUPS.forEach(g=>{delete W.present[g.id]}); W.present.g_toplanti=[]; W.present.g_ofis=[];
    pushMsg('g_genel',{who:'gm',act:true,text:'☀️ Yeni gün, mesai başladı; herkes yerinde.',t:Date.now()});
  }else if(!now&&newDay){   // gece atlandı, hâlâ mesai dışı
    W.present=W.present||{}; GROUPS.forEach(g=>{W.present[g.id]=[]});
  }
  saveW(); renderHudBar(); refresh?.();
}
function advClock(min){if(!W)return;setClk(clkNow()+min)}
function renderHudBar(){
  if(!W){$('hudbar').textContent='Oyun başlatılmadı';return}
  const h=W.hud;$('hudbar').title=meRole().title;$('hudbar').innerHTML=`<span>${meRole().ico} 🕐 ${clkStr()} · ${esc(h.tarih)} · ${esc(h.finans.piyasa)} · YK ${h.yk.sen}-${h.yk.muhalif}-${h.yk.kararsiz}</span><span>${h.krizler.length?'🚨 '+h.krizler.length:'✅'}</span>`;
}
function renderHeader(){
  const g=isGroup(current);
  $('hav').innerHTML=avatar(current);
  $('hname').textContent=chatName(current);
  const ty=typingText(current), s=$('hsub');
  s.className=ty?'ty':''; s.textContent=ty||(isChan(current)?'Haber kanalı · gelişmeler buraya düşer':isBack(current)?(isBg(current)?backIds(current).map(x=>fnm(agent(x)?.name)).join(', ')+' · ':'')+'Perde arkası · ajanlar kendi aralarında yazışıyor, sadece sen görüyorsun':g?'Odada: '+(presentOf(current).map(x=>fnm(agent(x)?.name)).filter(Boolean).join(', ')||'kimse yok')+(W?.out?.[current]?' · (sen odada değilsin)':', Sen'):agent(current).role);
  $('bar').style.display=(isBack(current)||isChan(current)||(!isGroup(current)&&fired(current)))?'none':'flex';
  updateUndo();
  $('mbtn').style.display=(g&&(isBoss()||isRoom(current)))?'grid':'none';
  $('callall').style.display=(g&&roomPeople(current).some(a=>!presentOf(current).includes(a.id)))?'grid':'none';
  $('who').innerHTML=g?roomPeople(current).map(a=>`<div class="av ${a.muted?'mute':''} ${presentOf(current).includes(a.id)?'':'away'}${speakingNow.has(a.id)?'sp':''}" data-id="${a.id}" title="${esc(a.name)}: sesi ${a.muted?'aç':'kapat'}" style="background:${a.color}">${esc(initial(a.name))}</div>`).join(''):'';
  $('who').querySelectorAll('.av').forEach(e=>e.onclick=()=>{const a=agent(e.dataset.id);a.muted=!a.muted;saveS();if(a.muted)stopSpeech();renderHeader()});
  $('vbtn').textContent=S.voiceOn?'🔊':'🔇'; $('vbtn').classList.toggle('on',S.voiceOn); $('vbtn').title=S.voiceOn?'Sesi kapat':'Sesi aç';
}
function openChat(id){current=id;unread[id]=0;document.body.classList.add('inchat');renderList();renderHeader();renderMessages()}
const refresh=()=>{renderList();renderHeader()};

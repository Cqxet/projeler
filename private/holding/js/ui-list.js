import {presentOf,roomPeople} from './ai-core.js';
import {CHANS,GROUPS,canSee,fixOffice,isBoss,isRoom,meRole} from './data.js';
import {applyFilters,emit} from './hooks.js';
import {$,esc,fmt} from './lib/util.js';
import {agent,backIds,chatName,fired,fnm,group,isBack,isBg,isChan,isGroup,msgs,saveS,saveW,speakingNow,state} from './state.js';
import {stopSpeech} from './tts.js';
import {pushMsg,renderMessages} from './ui-messages.js';
import {updateUndo} from './undo.js';
/* ================= Liste & başlık ================= */
export const initial=n=>(n||'?').replace(/^(Prof\. Dr\.|Av\.)\s*/,'')[0].toUpperCase();
export function avatar(id,cls=''){
  if(isGroup(id)) return `<div class="av ${cls}" style="background:#374248">${group(id).ico}</div>`;
  if(isChan(id)) return `<div class="av ${cls}" style="background:#1f6f5c">${CHANS.find(c=>c.id===id).ico}</div>`;
  if(isBack(id)) return `<div class="av ${cls}" style="background:#4a3b66">${isBg(id)?'🕶':'👁'}</div>`;
  const a=agent(id); return `<div class="av ${cls} ${speakingNow.has(id)?'sp':''}" style="background:${a.color}">${esc(initial(a.name))}</div>`;
}
export function typingText(c){const t=state.typing[c];if(!t||!t.size)return '';return [...t].map(i=>fnm(agent(i)?.name)).filter(Boolean).join(', ')+' yazıyor…'}
export function renderList(){
  fixOffice();
  const sec=(t,ids)=>`<div class="gl">${t}</div>`+ids.map(id=>{
    const m=msgs(id), last=m[m.length-1], ty=typingText(id);
    const who=last?(last.who==='user'?'Sen: ':(isGroup(id)||isBack(id))?(fnm(agent(last.who)?.name)||'')+': ':''):'';
    const pv=ty?`<span class="ty">${esc(ty)}</span>`:`<span>${last?esc(who+last.text):(isGroup(id)?'Grup sohbeti':isChan(id)?'Haber kanalı':esc(agent(id).role))}</span>`;
    return `<div class="ci ${id===state.current?'sel':''}" data-id="${id}">${avatar(id)}<div class="mid"><div class="r1"><span class="nm">${esc(chatName(id))}</span><span class="tm">${last?fmt(last.t):''}</span></div><div class="pv">${pv}${state.unread[id]?`<span class="bdg">${state.unread[id]}</span>`:''}</div></div></div>`;
  }).join('');
  const rv=state.S.agents.filter(a=>a.grp==='rival'&&!fired(a.id));
  const ex=state.S.agents.filter(a=>a.grp!=='staff'&&a.grp!=='rival'&&!fired(a.id)), st=state.S.agents.filter(a=>a.grp==='staff'&&!fired(a.id)), ft=state.S.agents.filter(a=>fired(a.id));
  const bk=state.S.showBack?Object.keys(state.M).filter(k=>isBack(k)&&state.M[k].length).sort((x,y)=>state.M[y][state.M[y].length-1].t-state.M[x][state.M[x].length-1].t):[];
  $('list').innerHTML=sec('Gruplar',GROUPS.filter(g=>canSee(g.id)).map(g=>g.id))+sec('Kanallar',CHANS.map(c=>c.id))+(bk.length?sec('👁 Perde arkası (sadece sen görürsün)',bk):'')+(rv.length?sec('🦈 Karşı taraf (Borealis Capital)',rv.map(a=>a.id)):'')+sec('Yönetim (özel yazışma)',ex.map(a=>a.id))+sec('Çalışanlar (özel yazışma)',st.map(a=>a.id))+(ft.length?sec('🔴 Ayrılanlar (işten çıkarıldı)',ft.map(a=>a.id)):'');
  $('list').querySelectorAll('.ci').forEach(e=>e.onclick=()=>openChat(e.dataset.id));
  emit('afterRenderList');
}
export const DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
export const clkNow=()=>{if(!state.W)return 540;if(typeof state.W.clk!=='number')state.W.clk=540+Math.floor(Math.random()*120);return state.W.clk};
export const clkHM=()=>{const m=((clkNow()%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
export const clkStr=()=>`${DAYS[Math.floor(clkNow()/1440)%7]} ${clkHM()}`;
export const isOffice=m=>{const h=((m%1440)+1440)%1440;return h>=540&&h<1080};
export function setClk(t){
  if(!state.W)return; t=applyFilters('clockTarget',t); const o=clkNow(); state.W.clk=t;
  const newDay=Math.floor(t/1440)!==Math.floor(o/1440), was=isOffice(o), now=isOffice(t);
  if(was&&!now&&!newDay){   // mesai bitti: herkes ofisten çıkar
    state.W.present=state.W.present||{}; GROUPS.forEach(g=>{state.W.present[g.id]=[]});
    pushMsg('g_genel',{who:'gm',act:true,text:'🌙 Mesai bitti; herkes ofisten ayrıldı. Yazışmalar özelden sürer.',t:Date.now()});
  }else if(now&&(!was||newDay)){   // yeni gün: ofis dolar
    state.W.present=state.W.present||{}; GROUPS.forEach(g=>{delete state.W.present[g.id]}); state.W.present.g_toplanti=[]; state.W.present.g_ofis=[];
    pushMsg('g_genel',{who:'gm',act:true,text:'☀️ Yeni gün, mesai başladı; herkes yerinde.',t:Date.now()});
  }else if(!now&&newDay){   // gece atlandı, hâlâ mesai dışı
    state.W.present=state.W.present||{}; GROUPS.forEach(g=>{state.W.present[g.id]=[]});
  }
  saveW(); renderHudBar(); refresh?.();
  emit('timeAdvanced',{from:o,to:clkNow()});
}
export function advClock(min){if(!state.W)return;setClk(clkNow()+min)}
export function renderHudBar(){
  if(!state.W){$('hudbar').textContent='Oyun başlatılmadı';return}
  const h=state.W.hud;$('hudbar').title=meRole().title;$('hudbar').innerHTML=`<span>${meRole().ico} 🕐 ${clkStr()} · ${esc(h.tarih)} · ${esc(h.finans.piyasa)} · YK ${h.yk.sen}-${h.yk.muhalif}-${h.yk.kararsiz}</span><span>${h.krizler.length?'🚨 '+h.krizler.length:'✅'}</span>`;
}
export function renderHeader(){
  const g=isGroup(state.current);
  $('hav').innerHTML=avatar(state.current);
  $('hname').textContent=chatName(state.current);
  const ty=typingText(state.current), s=$('hsub');
  s.className=ty?'ty':''; s.textContent=ty||(isChan(state.current)?'Haber kanalı · gelişmeler buraya düşer':isBack(state.current)?(isBg(state.current)?backIds(state.current).map(x=>fnm(agent(x)?.name)).join(', ')+' · ':'')+'Perde arkası · ajanlar kendi aralarında yazışıyor, sadece sen görüyorsun':g?'Odada: '+(presentOf(state.current).map(x=>fnm(agent(x)?.name)).filter(Boolean).join(', ')||'kimse yok')+(state.W?.out?.[state.current]?' · (sen odada değilsin)':', Sen'):agent(state.current).role);
  $('bar').style.display=(isBack(state.current)||isChan(state.current)||(!isGroup(state.current)&&fired(state.current)))?'none':'flex';
  updateUndo();
  $('mbtn').style.display=(g&&(isBoss()||isRoom(state.current)))?'grid':'none';
  $('callall').style.display=(g&&roomPeople(state.current).some(a=>!presentOf(state.current).includes(a.id)))?'grid':'none';
  $('who').innerHTML=g?roomPeople(state.current).map(a=>`<div class="av ${a.muted?'mute':''} ${presentOf(state.current).includes(a.id)?'':'away'}${speakingNow.has(a.id)?'sp':''}" data-id="${a.id}" title="${esc(a.name)}: sesi ${a.muted?'aç':'kapat'}" style="background:${a.color}">${esc(initial(a.name))}</div>`).join(''):'';
  $('who').querySelectorAll('.av').forEach(e=>e.onclick=()=>{const a=agent(e.dataset.id);a.muted=!a.muted;saveS();if(a.muted)stopSpeech();renderHeader()});
  $('vbtn').textContent=state.S.voiceOn?'🔊':'🔇'; $('vbtn').classList.toggle('on',state.S.voiceOn); $('vbtn').title=state.S.voiceOn?'Sesi kapat':'Sesi aç';
}
export function openChat(id){state.current=id;state.unread[id]=0;document.body.classList.add('inchat');renderList();renderHeader();renderMessages()}
export const refresh=()=>{renderList();renderHeader()};

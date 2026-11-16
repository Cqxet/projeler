import {presentOf} from './ai-core.js';
import {OFFICES,meRole} from './data.js';
import {emit} from './hooks.js';
import {$,esc,fmt} from './lib/util.js';
import {agent,elOf,group,isBack,isChan,isGroup,msgs,saveM,state} from './state.js';
import {refresh} from './ui-list.js';
/* ================= Mesajlar ================= */
export function addBubble(m){
  if(m.act){const s=document.createElement('div');s.className='sys';s.style.color='#8fd3c4';s.textContent=m.text;$('log').appendChild(s);return s}
  const a=agent(m.who), mine=m.who==='user';
  const row=document.createElement('div'); row.className='row '+(mine?'out':'in')+(m.who==='gm'?' gm':'');
  const nm=(!mine&&a&&(isGroup(state.current)||isBack(state.current)||m.who==='gm'))?`<div class="nm" style="color:${a.color}">${esc(a.name)}<span>${esc(a.role)}</span></div>`:'';
  if(mine&&m.rd!==undefined&&m.rd<2&&Date.now()-m.t>20000)m.rd=2;   // eski mesajlar okunmuş sayılır
  const lv=mine?(m.rd??2):0, tk=mine?`<span class="tk r${lv}">${lv?'✓✓':'✓'}</span>`:'';
  row.innerHTML=`<div class="bub">${nm}<span class="tx"></span>${tk}<span class="tm">${fmt(m.t)}</span></div>`;
  const tx=row.querySelector('.tx'); tx.textContent=m.text; $('log').appendChild(row); elOf.set(m,tx); return tx;
}
export function renderMessages(){
  const L=$('log'); L.innerHTML=''; elOf.clear();
  const list=msgs(state.current);
  if(!list.length){const s=document.createElement('div');s.className='sys';
    s.textContent=isChan(state.current)?'Haber kanalı: piyasadaki ve holdingdeki gelişmeler buraya düşer.':isBack(state.current)?'Henüz yazışma yok.':state.current==='g_ofis'?`${group('g_ofis').name}: ${(OFFICES[meRole().id]||OFFICES.baskan)[2]} Şu an yalnızsın. Birini çağırmak için adını yaz ("Aylin Hanım gelsin"); 👥 ile de seçebilirsin. Çıkarmak için "çıkabilirsiniz" yaz. Zaman zaman biri kapını çalar.`:state.current==='g_toplanti'?'Toplantı Odası: şu an boş. Birini çağırmak için adını yaz ("Murat Bey ve Aylin Hanım gelsin"); 👥 ile de seçebilirsin. Sadece odadakiler seni duyar ve cevap verir. Çıkarmak için "çıkabilirsiniz" yaz.':isGroup(state.current)?`${group(state.current).name} grubu: yazdığın mesajı üyeler aynı anda cevaplar. Bu grupta söylediklerini sadece üyeler duyar.`:`${agent(state.current).name} ile özel yazışma. Burada söylediklerini diğerleri duymaz.`;L.appendChild(s)}
  list.forEach(addBubble); L.scrollTop=1e9;
}
export function sysNote(t){const s=document.createElement('div');s.className='sys';s.textContent=t;$('log').appendChild(s);$('log').scrollTop=1e9}
export function pushMsg(chat,m){
  emit('beforePushMsg',{chat,m});
  if(isGroup(chat)&&!m.pr)m.pr=[...presentOf(chat)];   // bu mesajı o an odada olanlar görür
  const l=msgs(chat); l.push(m);
  if(chat===state.current){ if(l.length===1)$('log').innerHTML=''; addBubble(m);$('log').scrollTop=1e9 } else if(m.who!=='user')state.unread[chat]=(state.unread[chat]||0)+1;
  saveM();
  emit('messagePushed',{chat,m});
}
export function updateBubble(chat,m){
  if(chat!==state.current)return; const L=$('log'), near=L.scrollHeight-L.scrollTop-L.clientHeight<120;
  const tx=elOf.get(m); if(tx)tx.textContent=m.text; else addBubble(m); if(near)L.scrollTop=1e9;
}
export function setTyping(chat,id,on){emit('typing',{chat,id,on});(state.typing[chat]||(state.typing[chat]=new Set()))[on?'add':'delete'](id);refresh()}

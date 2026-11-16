import {esc} from './util.js';
import {agent,isBack,isChan,isGroup,state} from '../state.js';
import {openChat} from '../ui-list.js';
/* ================= Bildirim kabuğu: CSS, toast kutusu, telefon/sahne kartı katmanı, bip sesi ================= */
const rxStyle=document.createElement('style');
rxStyle.textContent=`
#rxtoasts{position:fixed;right:14px;bottom:80px;z-index:20;display:flex;flex-direction:column;gap:8px;max-width:320px}
.rxt{background:#202c33;border-left:3px solid #00a884;border-radius:8px;padding:8px 12px;box-shadow:0 6px 20px #0008;cursor:pointer;font-size:13.5px;animation:rxin .25s}
.rxt b{display:block;font-size:12.5px;color:#00a884}
@keyframes rxin{from{transform:translateX(30px);opacity:0}}
#rxcall{position:fixed;inset:0;background:#000a;z-index:30;display:none;align-items:center;justify-content:center}
#rxcall.open{display:flex}
#rxcall .box{background:#111b21;border-radius:16px;padding:22px;width:340px;max-width:92%;text-align:center}
#rxcall .big{width:78px;height:78px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;font-size:32px;font-weight:700;color:#fff}
#rxcall.ring .big{animation:pulse 1s infinite}
#rxcall .row2{display:flex;gap:10px;margin-top:16px}
#rxcall .row2 button{flex:1;padding:11px;border-radius:24px;font-weight:700}
#rxcall .opts{display:flex;flex-direction:column;gap:8px;margin-top:14px}
#rxcall .opts button{padding:10px 12px;border-radius:12px;background:#202c33;color:#e9edef;text-align:left;font-size:13.5px}
#rxcall .opts button:hover{background:#2a3942}
#rxcall .ok{background:#00a884;color:#06130f}#rxcall .no{background:#e5484d;color:#fff}
.rxdoc{white-space:pre-wrap;background:#1a252c;border-radius:8px;padding:12px;font-size:13.5px;margin-top:10px;max-height:60vh;overflow:auto}
.rxrow{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);font-size:13.5px;align-items:center}
.rxrow button{font-size:11.5px;padding:2px 7px;background:#2a3942;border-radius:6px;margin-left:4px}
.rxrow button:hover{background:#34454f}
.rxrow .l{cursor:pointer}
`;
document.head.appendChild(rxStyle);
export const toasts=document.createElement('div');toasts.id='rxtoasts';document.body.appendChild(toasts);
export const callov=document.createElement('div');callov.id='rxcall';document.body.appendChild(callov);
/* ---------- bildirim, ses, sekme başlığı ---------- */
export function beep(f=880,d=.12){try{const c=beep.c||(beep.c=new(window.AudioContext||window.webkitAudioContext)());const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.value=.04;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d)}catch(e){}}
export function notify(title,body,chat){
  if(state.S.rxSound!==false)beep();
  const t=document.createElement('div');t.className='rxt';t.innerHTML=`<b>${esc(title)}</b>${esc(String(body).slice(0,110))}`;
  t.onclick=()=>{t.remove();if(chat&&(isGroup(chat)||agent(chat)||isChan(chat)||isBack(chat)))openChat(chat)};
  toasts.appendChild(t);setTimeout(()=>t.remove(),7000);while(toasts.children.length>3)toasts.firstChild.remove();
  try{if(state.S.rxNotify&&document.hidden&&Notification.permission==='granted')new Notification(title,{body:String(body).slice(0,140)})}catch(e){}
}

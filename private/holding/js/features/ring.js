import {runAgent} from '../ai-core.js';
import {beep,callov} from '../lib/notify.js';
import {$,esc} from '../lib/util.js';
import {dm,hit,live,loyAdd,susAdd} from '../lib/world.js';
import {agent,saveW,state} from '../state.js';
import {clkHM,initial,openChat,refresh} from '../ui-list.js';
import {pushMsg} from '../ui-messages.js';
/* ---------- telefon / sahne kartı ---------- */
export const ringQ=[];export let ringCur=null,ringTimer=null;
export function ring(o){ringQ.push(o);if(!ringCur)nextRing()}
export function nextRing(){
  const o=ringQ.shift();if(!o){ringCur=null;callov.classList.remove('open','ring');return}
  if(!live(o.who)){nextRing();return}
  ringCur=o;const a=agent(o.who),scene=!!o.kind;   // kind yoksa telefon çağrısı; 'scene' / 'invite' kart
  callov.innerHTML=`<div class="box"><div class="big" style="background:${a.color}">${esc(initial(a.name))}</div><b style="font-size:17px">${scene?esc(o.title||a.name):'📞 '+esc(a.name)+' arıyor…'}</b><div class="mut" style="margin:2px 0 8px">${esc(a.name)} · ${esc(a.role)}</div><div style="font-size:14.5px">${esc(o.text)}</div>${o.opts?`<div class="opts">${o.opts.map((p,i)=>`<button data-i="${i}">${esc(p)}</button>`).join('')}</div>`:`<div class="row2"><button class="no" id="rxno">${esc(o.no||(scene?'Bu sefer olmaz':'Reddet'))}</button><button class="ok" id="rxok">${esc(o.ok||(scene?'Git':'Aç'))}</button></div>`}</div>`;
  callov.classList.add('open');if(!scene)callov.classList.add('ring');
  if(!scene){beep(740,.15);setTimeout(()=>beep(740,.15),300)}else beep(620,.1);
  const done=ok=>{clearTimeout(ringTimer);callov.classList.remove('open','ring');ringCur=null;try{o.onAnswer?o.onAnswer(ok):answer(o,ok)}catch(e){console.error(e)}setTimeout(nextRing,300)};
  if(o.opts){callov.querySelectorAll('.opts button').forEach(b=>b.onclick=()=>done(+b.dataset.i))}
  else{$('rxok').onclick=()=>done(true);$('rxno').onclick=()=>done(false)}
  ringTimer=setTimeout(()=>{if(ringCur===o)done(o.opts?(o.def??o.opts.length-1):false)},o.opts?300000:scene?120000:40000);
}
export function answer(o,ok){
  const a=agent(o.who);if(!a||!state.W)return;
  const [lo,ln]=o.loy||[3,-3];
  if(ok){
    loyAdd(o.who,lo);saveW();openChat(o.who);
    if(state.S.model)runAgent(a,o.who,o.hint,99,true);else pushMsg(o.who,{who:o.who,text:o.text,t:Date.now()});
    if(o.who==='fatma'&&o.kind==='scene')state.W.rumors=state.W.rumors||{};
  }else{
    loyAdd(o.who,ln);if(o.kind!=='scene')susAdd(o.who,3);
    pushMsg(o.who,{who:'gm',act:true,text:o.kind==='scene'?`🌙 Davete gitmedin (${clkHM()}).`:`📞 Cevapsız çağrı (${clkHM()}).`,t:Date.now()});
    dm(o.who,o.kind==='scene'?'Anladım, başka zaman.':`${hit()}, sonra tekrar ararım.`);
  }
  saveW();refresh();
}

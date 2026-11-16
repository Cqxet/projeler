import {isBoss,loyOf} from '../data.js';
import {notify} from './notify.js';
import {clamp,day,hmOf} from './num.js';
import {esc} from './util.js';
import {agent,fired,state} from '../state.js';
import {DAYS} from '../ui-list.js';
import {pushMsg} from '../ui-messages.js';
/* ================= Dünya yardımcıları: özellik modüllerinin ortak dili ================= */
export const lbl=t=>DAYS[day(t)%7]+' '+hmOf(t);                       // "Salı 14:30"
export const hit=()=>isBoss()?'Başkanım':'Efendim';                     // kullanıcıya hitap
export const live=id=>id&&id!=='gm'&&agent(id)&&!fired(id);             // oyunda ve işten çıkarılmamış ajan
export const kvh=(k,v)=>`<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>`;
export function news(t){pushMsg('ch_haber',{who:'gm',text:'📰 '+t,t:Date.now()});state.W.chron=[...(state.W.chron||[]),t].slice(-25)}
export function gmNote(chat,text){pushMsg(chat,{who:'gm',act:true,text,t:Date.now()})}
export function dm(id,text){if(!live(id))return;pushMsg(id,{who:id,text,t:Date.now()});notify(agent(id).name,text,id)}
export function loyAdd(id,d){if(!live(id))return;state.W.loy=state.W.loy||{};state.W.loy[id]=clamp(Math.round(loyOf(id)+d),0,100)}
export function susAdd(id,d){if(!live(id))return;state.W.sus=state.W.sus||{};state.W.sus[id]=clamp((state.W.sus[id]||0)+d,0,100)}
export function crisis(t){const h=state.W.hud;if(!h.krizler.includes(t))h.krizler.push(t.slice(0,110));state.W.chron.push(t);state.W.backDue=t}

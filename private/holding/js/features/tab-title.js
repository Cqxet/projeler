import {on} from '../hooks.js';
import {state} from '../state.js';
/* ================= Sekme başlığı: okunmamış mesaj sayısı ================= */
export function setTitle(){const n=Object.values(state.unread).reduce((s,v)=>s+(v||0),0);document.title=(n?`(${n}) `:'')+'Soylu Holding'}
on('afterRenderList',()=>{try{setTitle()}catch(e){}});

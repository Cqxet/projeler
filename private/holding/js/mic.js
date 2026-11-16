import {idle,send} from './ai-core.js';
import {$} from './lib/util.js';
import {state} from './state.js';
import {stopSpeech} from './tts.js';
import {sysNote} from './ui-messages.js';
/* ================= Mikrofon ================= */
export const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
export function startListening(){
  if(!SR){sysNote('Tarayıcı konuşma tanımayı desteklemiyor. Chrome/Edge kullan.');return}
  if(state.rec)return; stopSpeech();
  state.rec=new SR();state.rec.lang=state.S.lang||'tr-TR';state.rec.interimResults=true;state.rec.continuous=false;
  state.rec.onresult=e=>{let t='';for(const r of e.results)t+=r[0].transcript;$('text').value=t;syncAct()};
  state.rec.onerror=e=>{if(e.error==='not-allowed')sysNote('Mikrofon izni verilmedi. Adres http://localhost olmalı.')};
  state.rec.onend=()=>{state.rec=null;syncAct();const t=$('text').value.trim();if(t)send(t);else idle()};
  state.rec.start();syncAct();
}
export function stopListening(){if(state.rec){const r=state.rec;state.rec=null;r.onend=null;try{r.abort()}catch(e){}syncAct()}}
export function syncAct(){const has=$('text').value.trim().length>0;const b=$('act');b.textContent=state.rec?'⏺':has?'➤':'🎤';b.classList.toggle('rec',!!state.rec)}
export function initMic(){
$('act').onclick=()=>{if($('text').value.trim()&&!state.rec)send($('text').value);else if(state.rec)state.rec.stop();else startListening()};
$('text').oninput=syncAct; $('text').onkeydown=e=>{if(e.key==='Enter')send($('text').value)};
}

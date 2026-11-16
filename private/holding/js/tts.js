import {idle} from './ai-core.js';
import {$} from './lib/util.js';
import {renderCfg} from './settings.js';
import {speakingNow,state} from './state.js';
import {refresh} from './ui-list.js';
/* ================= Ses (TTS) ================= */
export let gen=0;
export function loadVoices(){state.voices=speechSynthesis.getVoices().sort((a,b)=>(b.lang.startsWith('tr')-a.lang.startsWith('tr'))||a.name.localeCompare(b.name));if($('cfg').classList.contains('open'))renderCfg()}
export function initTts(){speechSynthesis.onvoiceschanged=loadVoices; loadVoices();}
export function pickVoice(a){
  if(a.voice){const v=state.voices.find(v=>v.name===a.voice);if(v)return v}
  const tr=state.voices.filter(v=>v.lang.toLowerCase().startsWith('tr')); if(!tr.length)return null;
  const fem=/emel|filiz|seda|yelda|female|kad[ıi]n/i;
  const pool=tr.filter(v=>(a.g==='f')===fem.test(v.name)), list=pool.length?pool:tr;
  return list[state.S.agents.indexOf(a)%list.length];
}
export function say(a,text,force){
  text=text.trim(); if(!text||(!force&&(!state.S.voiceOn||a.muted)))return;
  const u=new SpeechSynthesisUtterance(text), v=pickVoice(a);
  if(v){u.voice=v;u.lang=v.lang}else u.lang='tr-TR';
  u.pitch=a.pitch;u.rate=a.rate; const g=gen; state.pending++;
  u.onstart=()=>{if(g!==gen)return;speakingNow.add(a.id);refresh()};
  const fin=()=>{if(g!==gen)return;state.pending=Math.max(0,state.pending-1);if(!state.pending){speakingNow.clear();refresh();idle()}};
  u.onend=u.onerror=fin; speechSynthesis.speak(u);
}
export function stopSpeech(){gen++;state.pending=0;speechSynthesis.cancel();speakingNow.clear();refresh()}
export function makeSpeaker(a,live){
  let buf='',all='';
  return {push(t){all+=t;if(!live)return;buf+=t;let m;
      while((m=buf.match(/^[\s\S]*?([.!?…]+["')]?(\s+|$)|\n)/))&&m[0].length<buf.length){say(a,m[0]);buf=buf.slice(m[0].length)}},
    end(){say(a,live?buf:all)}};
}
export const MEDIA={foto:['📷','Fotoğraf'],fotoğraf:['📷','Fotoğraf'],selfie:['🤳','Selfie'],video:['🎥','Video'],konum:['📍','Konum'],ses:['🎤','Sesli mesaj'],hediye:['🎁','Hediye'],çiçek:['💐','Çiçek'],belge:['📎','Belge']};
export const clean=t=>t.replace(/[📷🤳🎥📍🎤🎁💐📎]/gu,'').replace(/[*_#`>]+/g,'').replace(/\s+/g,' ');

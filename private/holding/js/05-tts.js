/* ================= Ses (TTS) ================= */
let pending=0, gen=0;
function loadVoices(){voices=speechSynthesis.getVoices().sort((a,b)=>(b.lang.startsWith('tr')-a.lang.startsWith('tr'))||a.name.localeCompare(b.name));if($('cfg').classList.contains('open'))renderCfg()}
speechSynthesis.onvoiceschanged=loadVoices; loadVoices();
function pickVoice(a){
  if(a.voice){const v=voices.find(v=>v.name===a.voice);if(v)return v}
  const tr=voices.filter(v=>v.lang.toLowerCase().startsWith('tr')); if(!tr.length)return null;
  const fem=/emel|filiz|seda|yelda|female|kad[ıi]n/i;
  const pool=tr.filter(v=>(a.g==='f')===fem.test(v.name)), list=pool.length?pool:tr;
  return list[S.agents.indexOf(a)%list.length];
}
function say(a,text,force){
  text=text.trim(); if(!text||(!force&&(!S.voiceOn||a.muted)))return;
  const u=new SpeechSynthesisUtterance(text), v=pickVoice(a);
  if(v){u.voice=v;u.lang=v.lang}else u.lang='tr-TR';
  u.pitch=a.pitch;u.rate=a.rate; const g=gen; pending++;
  u.onstart=()=>{if(g!==gen)return;speakingNow.add(a.id);refresh()};
  const fin=()=>{if(g!==gen)return;pending=Math.max(0,pending-1);if(!pending){speakingNow.clear();refresh();idle()}};
  u.onend=u.onerror=fin; speechSynthesis.speak(u);
}
function stopSpeech(){gen++;pending=0;speechSynthesis.cancel();speakingNow.clear();refresh()}
function makeSpeaker(a,live){
  let buf='',all='';
  return {push(t){all+=t;if(!live)return;buf+=t;let m;
      while((m=buf.match(/^[\s\S]*?([.!?…]+["')]?(\s+|$)|\n)/))&&m[0].length<buf.length){say(a,m[0]);buf=buf.slice(m[0].length)}},
    end(){say(a,live?buf:all)}};
}
const MEDIA={foto:['📷','Fotoğraf'],fotoğraf:['📷','Fotoğraf'],selfie:['🤳','Selfie'],video:['🎥','Video'],konum:['📍','Konum'],ses:['🎤','Sesli mesaj'],hediye:['🎁','Hediye'],çiçek:['💐','Çiçek'],belge:['📎','Belge']};
const clean=t=>t.replace(/[📷🤳🎥📍🎤🎁💐📎]/gu,'').replace(/[*_#`>]+/g,'').replace(/\s+/g,' ');

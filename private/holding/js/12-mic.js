/* ================= Mikrofon ================= */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition; let rec=null;
function startListening(){
  if(!SR){sysNote('Tarayıcı konuşma tanımayı desteklemiyor. Chrome/Edge kullan.');return}
  if(rec)return; stopSpeech();
  rec=new SR();rec.lang=S.lang||'tr-TR';rec.interimResults=true;rec.continuous=false;
  rec.onresult=e=>{let t='';for(const r of e.results)t+=r[0].transcript;$('text').value=t;syncAct()};
  rec.onerror=e=>{if(e.error==='not-allowed')sysNote('Mikrofon izni verilmedi. Adres http://localhost olmalı.')};
  rec.onend=()=>{rec=null;syncAct();const t=$('text').value.trim();if(t)send(t);else idle()};
  rec.start();syncAct();
}
function stopListening(){if(rec){const r=rec;rec=null;r.onend=null;try{r.abort()}catch(e){}syncAct()}}
function syncAct(){const has=$('text').value.trim().length>0;const b=$('act');b.textContent=rec?'⏺':has?'➤':'🎤';b.classList.toggle('rec',!!rec)}
$('act').onclick=()=>{if($('text').value.trim()&&!rec)send($('text').value);else if(rec)rec.stop();else startListening()};
$('text').oninput=syncAct; $('text').onkeydown=e=>{if(e.key==='Enter')send($('text').value)};

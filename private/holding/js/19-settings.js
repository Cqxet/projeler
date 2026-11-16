/* ================= Ayarlar ================= */
function openCfg(){renderCfg();$('cfg').classList.add('open')}
function renderCfg(){
  const p=$('cfgp');
  p.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">Ayarlar</b><button class="ib" id="cx">✕</button></div>
  <button class="btn g" id="nw" style="width:100%;margin-top:10px">🎲 Yeni oyun / senaryo seç</button>
  <h3>9Router bağlantısı</h3>
  <label>Base URL</label><input data-s="base">
  <label>API Key</label><input data-s="key" type="password" placeholder="sk-...">
  <label>Model / Combo</label><div class="r2"><input data-s="model" list="mdl" placeholder="model veya combo adı"><button class="btn" id="lm" style="flex:0 0 44px">↻</button></div>
  <datalist id="mdl"></datalist><div class="mut" id="cs" style="margin-top:6px"></div>
  <h3>Ses & oyun</h3>
  <div class="chk"><input type="checkbox" id="c_v"><span>Sesli okuma açık</span></div>
  <div class="chk"><input type="checkbox" id="c_h"><span>Eller serbest (cevaplar bitince mikrofon açılır)</span></div>
  <div class="chk"><input type="checkbox" id="c_a"><span>Holding panelini otomatik güncelle (her mesajdan sonra 1 ek istek)</span></div>
  <div class="chk"><input type="checkbox" id="c_c"><span>Zincirleme konuşma: bir ajan sıradakine seslenince o da kendiliğinden cevap versin (oylama vb.)</span></div>
  <div class="chk"><input type="checkbox" id="c_b"><span>Ajanlar kendi aralarında otomatik yazışsın (her 3 mesajda, kriz ve yeni çeyrekte; ~8-10 ek istek)</span></div>
  <div class="chk"><input type="checkbox" id="c_o"><span>Karşı taraftaki ajanlar olaylara göre bana özelden yazsın</span></div>
  <div class="chk"><input type="checkbox" id="c_s"><span>Perde arkası yazışmalarını listede göster</span></div>
  <label>Mikrofon dili</label><input data-s="lang">
  <h3>Kadro</h3><div id="ags"></div>
  <button class="btn" id="ex" style="width:100%;margin-top:8px">💾 Tüm sohbetleri dışa aktar (.txt)</button>
  <button class="btn" id="rs" style="width:100%;margin-top:8px">Kadroyu varsayılana sıfırla</button>`;
  p.querySelectorAll('[data-s]').forEach(el=>{el.value=S[el.dataset.s];el.oninput=()=>{S[el.dataset.s]=el.value.trim();saveS()}});
  $('c_v').checked=S.voiceOn;$('c_v').onchange=e=>{S.voiceOn=e.target.checked;saveS();if(!S.voiceOn)stopSpeech();refresh()};
  $('c_h').checked=S.handsfree;$('c_h').onchange=e=>{S.handsfree=e.target.checked;saveS()};
  $('c_a').checked=S.autoHud;$('c_a').onchange=e=>{S.autoHud=e.target.checked;saveS()};
  $('c_c').checked=S.chain;$('c_c').onchange=e=>{S.chain=e.target.checked;saveS()};
  $('c_b').checked=S.backAuto;$('c_b').onchange=e=>{S.backAuto=e.target.checked;saveS()};
  $('c_o').checked=S.outreach!==false;$('c_o').onchange=e=>{S.outreach=e.target.checked;saveS()};
  $('c_s').checked=S.showBack;$('c_s').onchange=e=>{S.showBack=e.target.checked;saveS();if(!S.showBack&&isBack(current))openChat('g_genel');else renderList()};
  $('cx').onclick=()=>$('cfg').classList.remove('open'); $('lm').onclick=loadModels; $('nw').onclick=openNg; $('ex').onclick=exportChats;
  $('rs').onclick=()=>{if(confirm('Kadro ve ayarlar sıfırlansın mı?')){const k=S.key,b=S.base,m=S.model;S=defS();S.key=k;S.base=b;S.model=m;saveS();renderCfg();renderList();renderHeader()}};
  const box=$('ags');
  S.agents.forEach(a=>{
    const d=document.createElement('details');d.className='ag';
    d.innerHTML=`<summary><span style="color:${a.color}">●</span> ${esc(a.name)} <span class="mut">${esc(a.role)}</span></summary>
    <div class="r2"><div><label>İsim</label><input data-k="name"></div><div><label>Rol</label><input data-k="role"></div></div>
    <label>Karakter</label><textarea rows="4" data-k="prompt"></textarea>
    <label>Gizli gündem</label><textarea rows="3" data-k="secret"></textarea>
    <label>Ses</label><select data-k="voice"><option value="">(otomatik)</option>${voices.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} (${v.lang})</option>`).join('')}</select>
    <div class="r2"><div><label>Perde</label><input type="range" min="0.5" max="1.8" step="0.05" data-k="pitch"></div><div><label>Hız</label><input type="range" min="0.6" max="1.6" step="0.05" data-k="rate"></div></div>
    <button class="btn" style="margin-top:8px">🔊 Sesi dene</button>`;
    d.querySelectorAll('[data-k]').forEach(el=>{const k=el.dataset.k;el.value=a[k]??'';
      el.oninput=()=>{a[k]=el.type==='range'?parseFloat(el.value):el.value;saveS();if(k==='name'||k==='role'){renderList();renderHeader()}}});
    d.querySelector('button').onclick=()=>{stopSpeech();say(a,`Merhaba Başkanım, ben ${a.name}. ${a.role} olarak buradayım.`,true)};
    box.appendChild(d);
  });
}
async function loadModels(){
  const cs=$('cs'); cs.textContent='Bağlanıyor…';
  try{
    const r=await fetch(api('/models'),{headers:S.key?{Authorization:'Bearer '+S.key}:{}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const ids=((await r.json()).data||[]).map(m=>m.id);
    $('mdl').innerHTML=ids.map(i=>`<option value="${esc(i)}">`).join('');
    cs.textContent=`✅ Bağlandı: ${ids.length} model/combo bulundu. Alana tıklayıp seç.`;
    if(!S.model&&ids[0]){S.model=ids[0];saveS();document.querySelector('[data-s=model]').value=S.model}
  }catch(e){cs.textContent='❌ Bağlanamadı: '+e.message+' — 9Router açık mı, Base URL doğru mu?'}
}

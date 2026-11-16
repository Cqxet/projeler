/* ================= Eklentiler: panel ekleri, fırsat, karar taslağı, dışa aktarma ================= */
function extraHud(){
  const nm=id=>fnm(agent(id)?.name)||id;
  const loy=S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)).map(a=>[a,loyOf(a.id)]).sort((x,y)=>y[1]-x[1]);
  const lovers=Object.keys(W.love||{}).filter(id=>agent(id)&&!fired(id));
  let h=(lovers.length?`<h3>💌 Sana duyguları olanlar</h3>`+lovers.map(id=>`<div class="kv"><span>${esc(fnm(agent(id).name))}</span><span>${W.love[id].st==='sevgili'?'💞 sevgilin':'aşkını ilan etti'} <button data-lv="${W.love[id].st==='sevgili'?'no':'yes'}:${id}" style="font-size:11px;padding:2px 6px">${W.love[id].st==='sevgili'?'💔 Bitir':'💞 Sevgili ol'}</button>${W.love[id].st==='sevgili'?'':` <button data-lv="no:${id}" style="font-size:11px;padding:2px 6px">Reddet</button>`}</span></div>`).join(''):'')+(S.agents.some(a=>infOf(a.id)>0)?`<h3>🎭 Etkin olduğun kişiler</h3>`+S.agents.filter(a=>infOf(a.id)>0&&!fired(a.id)).map(a=>`<div class="kv"><span>${esc(fnm(a.name))}</span><span>etki %${infOf(a.id)} · şüphe %${susOf(a.id)}</span></div>`).join(''):'')+`<h3>${isBoss()?"Başkan'a":'Sana'} sadakat</h3>`+loy.map(([a,v])=>`<div class="kv"><span>${esc(fnm(a.name))}</span><span><i style="display:inline-block;width:90px;height:8px;background:#2a3942;border-radius:4px;overflow:hidden;vertical-align:middle;margin-right:6px"><b style="display:block;height:100%;width:${v}%;background:${v>66?'#00a884':v>33?'#f5a623':'#ff6b6b'}"></b></i>${v}</span></div>`).join('');
  if(S.showBack){
    const R=W.rels||[], G=W.bgroups||[];
    h+=`<h3>💞 İlişkiler</h3>`+(R.length?R.map(r=>`<div class="kv"><span>${esc(nm(r.a))} ↔ ${esc(nm(r.b))}</span><span>${esc(r.tur)}${r.not?' · '+esc(r.not):''}</span></div>`).join(''):'<div class="mut">Henüz bir ilişki yok. "💘 İlişkileri ilerlet" ile tetikleyebilirsin.</div>');
    h+=`<h3>🕶 Gizli gruplar</h3>`+(G.length?G.map(g=>`<div class="kv"><span>${esc(g.name)} [${esc(g.tur)}]</span><span>${esc(g.members.map(nm).join(', '))}</span></div>`).join(''):'<div class="mut">Henüz yok.</div>');
  }
  return h;
}
function triggerOpportunity(){
  if(!W)return; snap('Fırsat'); const text=OPPS[Math.floor(Math.random()*OPPS.length)];
  openChat('g_genel'); const t=Date.now();
  pushMsg('g_genel',{who:'gm',text:'🎁 '+text,t}); pushMsg('ch_haber',{who:'gm',text:'📰 '+text,t});
  W.chron.push(text); W.backDue='Yeni fırsat: '+text; saveW(); stopSpeech(); say(agent('gm'),text);
  if(S.model){presentOf('g_genel').map(agent).filter(a=>a&&a.id!=='gm').forEach(a=>runAgent(a,'g_genel'));gmTick('Yeni fırsat doğdu (olumlu gelişme, kriz değil; panele yansıt): '+text)}
}
async function draftResolution(){
  if(!W)return; if(!S.model){openCfg();return}
  const box=$('ngc'); box.innerHTML='<b style="font-size:18px">📜 Karar taslağı hazırlanıyor…</b>'; $('ng').classList.add('open');
  const tr=msgs('g_yk').slice(-14).filter(m=>!m.act).map(m=>`${m.who==='user'?'BAŞKAN':agent(m.who)?.name}: ${m.text}`).join('\n')||'(yazışma yok)';
  const prompt=`Sen YK Genel Sekreteri Av. Sevgi Arslan'sın. Aşağıdaki Yönetim Kurulu yazışmasında tartışılan/alınan kararlardan TTK uyumlu bir YÖNETİM KURULU KARARI taslağı yaz: başlık (SOYLU HOLDİNG A.Ş. YÖNETİM KURULU KARARI), Karar No, tarih (${W.hud.tarih}), toplantıya katılanlar (Başkan, Murat Kaya, Kerem Soylu, Prof. Dr. Orhan Aksoy; Genel Sekreter Sevgi Arslan), gündem, numaralı karar maddeleri, oy durumu (oybirliği ya da oy çokluğu; muhalefet şerhi varsa belirt), imza satırları. Yazışmada karar yoksa "Henüz karar alınmamıştır" notunu düş. Sade metin, markdown yok.\n\nYAZIŞMA:\n${tr}`;
  let text='';
  try{
    const res=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),body:JSON.stringify({model:S.model,messages:[{role:'user',content:roleBlock()+prompt}],stream:false,max_tokens:900})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    text=((await res.json()).choices?.[0]?.message?.content||'').trim();
  }catch(e){text='Taslak oluşturulamadı: '+e.message}
  box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">📜 YK Karar Taslağı</b><button class="ib" id="rx">✕</button></div><textarea id="rt" rows="20" style="margin-top:10px"></textarea><button class="btn g" id="rc" style="margin-top:8px">Kopyala</button>`;
  $('rt').value=text; $('rx').onclick=()=>$('ng').classList.remove('open');
  $('rc').onclick=()=>{try{navigator.clipboard.writeText($('rt').value);$('rc').textContent='Kopyalandı ✓'}catch(e){$('rt').select()}};
}
function exportChats(){
  let out='SOYLU HOLDING · SOHBET DÖKÜMÜ\n\n';
  for(const k of Object.keys(M)){ if(!M[k].length)continue;
    out+=`=== ${chatName(k)} ===\n`+M[k].map(m=>`[${fmt(m.t)}] ${m.who==='user'?'BAŞKAN':agent(m.who)?.name||m.who}: ${m.text}`).join('\n')+'\n\n'}
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'text/plain;charset=utf-8'})); a.download='soylu-holding-sohbetler.txt'; a.click();
}

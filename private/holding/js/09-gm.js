/* ================= Oyun Yöneticisi: HUD güncelleme ================= */
let tickTimer=null, ticking=false;
function tickSoon(){clearTimeout(tickTimer);tickTimer=setTimeout(gmTick,1500)}
function lastUserT(){let t=0;for(const k in M)for(const m of M[k])if(m.who==='user'&&m.t>t)t=m.t;return t}
async function gmTick(reason){
  if(!W||!S.autoHud||!S.model||ticking)return;
  if(!reason&&lastUserT()<=(W.tickT||0))return;
  ticking=true; W.tickT=Date.now(); const ep=epoch;
  const all=[];for(const k in M)for(const m of M[k])all.push({k,m});
  all.sort((x,y)=>x.m.t-y.m.t);
  const tr=all.slice(-16).map(({k,m})=>`[${chatName(k)}] ${m.who==='user'?'BAŞKAN':agent(m.who)?.name}: ${m.text.slice(0,300)}`).join('\n');
  const prompt=`Sen bir holding rol yapma oyununun durum motorusun. Aşağıdaki güncel durumu, son yazışmaları ve olayı değerlendirip durumu GÜNCELLE. Hamlelerin gerçekçi, küçük ve nedensel sonuçlarını yansıt (piyasa, bankalar, SPK, Ankara, aile). Rakamları tutarlı tut; yk.sen+muhalif+kararsiz=9 olmalı. Çözülen krizleri listeden çıkar, yeni doğan krizleri ekle. "sadakat" alanında yalnızca anlamlı değişen ajanları güncelle (Başkan'a bağlılık 0-100; Başkan'ın adil/zalim davranışı, tutulan/tutulmayan sözler, ittifak ve ilişkiler etkiler). Bir gizli ilişki veya koalisyon dışa sızıyorsa bunu söylenti ya da itibar sorunu olarak yansıt.Yazışmalarda adı "↔" içeren sohbetler ajanların Başkan'dan gizli perde arkası yazışmalarıdır; onların gizli planlarını panele yazma, sadece dışa yansıyan sonuçları (söylenti, hisse hareketi, tutum değişikliği) yansıt.${W.calm?'BU SAKİN BİR SENARYO: kendiliğinden yeni kriz, skandal veya entrika uydurma; yalnızca küçük, rutin ve mantıklı değişiklikler yap. ':''}SADECE geçerli JSON döndür, başka metin yazma.\n\nŞema:\n{"hud":{"tarih":"","finans":{"piyasa":"","hisse":"","nakit":"","borc":"","rating":"","acil":""},"yk":{"sen":0,"muhalif":0,"kararsiz":0},"istirakler":[{"ad":"","d":"r|y|g","n":""}],"itibar":{"medya":"","spk":"","ankara":""},"krizler":[""]},"yeni_olaylar":["en fazla 3 kısa, kamuya açık gelişme"],"sadakat":{"ajan_id":50}}\n\nAJAN KİMLİKLERİ: ${S.agents.filter(a=>a.id!=='gm').map(a=>a.id+'='+fnm(a.name)).join(', ')}\nSENARYO: ${W.brief}\nMEVCUT HUD: ${JSON.stringify(W.hud)}\nSON YAZIŞMALAR:\n${tr}\nOLAY/NOT: ${reason||'Son yazışmalara göre durumu güncelle.'}`;
  try{
    const res=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),body:JSON.stringify({model:S.model,messages:[{role:'user',content:roleBlock()+prompt}],stream:false,max_tokens:900})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const txt=(await res.json()).choices?.[0]?.message?.content||'';
    if(ep!==epoch){ticking=false;return}
    const a=txt.indexOf('{'),b=txt.lastIndexOf('}'); const j=JSON.parse(txt.slice(a,b+1));
    if(j.hud){const h=W.hud;for(const k of Object.keys(j.hud)){const v=j.hud[k];h[k]=(v&&typeof v==='object'&&!Array.isArray(v))?{...h[k],...v}:v}
      if(!Array.isArray(h.krizler))h.krizler=[]; if(!Array.isArray(h.istirakler))h.istirakler=[]}
    if(Array.isArray(j.yeni_olaylar)){
      const ev=j.yeni_olaylar.filter(x=>typeof x==='string'&&x.trim());
      W.chron=[...(W.chron||[]),...ev].slice(-25);
      ev.forEach(o=>pushMsg('ch_haber',{who:'gm',text:'📰 '+o,t:Date.now()}));   // haber kanalına düşer
    }
    if(j.sadakat&&typeof j.sadakat==='object'){W.loy=W.loy||{};for(const k in j.sadakat){const v=Number(j.sadakat[k]);if(agent(k)&&isFinite(v))W.loy[k]=Math.max(0,Math.min(100,Math.round(v)))}}
    saveW();renderHudBar();if($('pnl').classList.contains('open'))renderHud();
  }catch(e){/* sessizce geç */}
  ticking=false;
}

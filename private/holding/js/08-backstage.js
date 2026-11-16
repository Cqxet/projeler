/* ================= Perde arkası: ajanlar kendi aralarında yazışır ================= */
let backBusy=false;
// Karşı taraftaki (sadakati düşük) ajanlar olaylara tepki olarak Başkan'a kendiliğinden ÖZELDEN yazar
// Aşk ilanı: bir ajan Başkan'a (kullanıcıya) duygularını açar; sonrası modele ve senin cevabına kalmış (ölçülü, cinsel olmayan)
// Aşk durumu: W.love[id]={st:'itiraf'|'sevgili'}; W.loveEx[id]=ayrılık zamanı (bir daha ilan etmez)
const partnerId=()=>Object.keys(W?.love||{}).find(id=>W.love[id].st==='sevgili'&&agent(id)&&!fired(id));
const loveLvl=id=>{const y=W?.love?.[id]?.yak??10;return y<25?'yeni flört, heyecanlı ve biraz çekingen':y<55?'yakın, rahat ve çekimi gizlemeyen':'derin, tutkulu ve birbirinize güvenen'};
// Manipülasyon: W.inf[id]=sende etkin (0-100), W.sus[id]=şüphesi (0-100)
const infOf=id=>W?.inf?.[id]||0, susOf=id=>W?.sus?.[id]||0;
function manipChance(id){
  const lv=W?.love?.[id]; let c=22+infOf(id)*0.4+(loyOf(id)-50)*0.25-susOf(id)*0.5+(lv?.st==='sevgili'?28:lv?12:0);
  return Math.max(5,Math.min(92,c));
}
function startLove(id,quiet){
  if(!W||!agent(id)||fired(id))return false;
  const p=partnerId(); if(p&&p!==id){sysNote(`Zaten ${fnm(agent(p).name)} ile ilişkin var. Önce onu bitirmelisin.`);return false}
  const love=W.love||(W.love={}); love[id]={st:'sevgili',t:Date.now(),yak:10};
  Object.keys(love).forEach(o=>{if(o!==id){delete love[o];(W.loveEx||(W.loveEx={}))[o]=Date.now()}});   // diğer aşk ilan edenler geri çekilir
  const ev=`Başkan ile ${agent(id).name} sevgili oldu.`; W.chron.push(ev); saveW();
  if(!quiet)sysNote(`💞 ${fnm(agent(id).name)} ile ilişkiniz başladı. Başkası artık sana aşk ilan etmez.`);
  return true;
}
function endLove(id,by,quiet,noReact){
  if(!W||!W.love?.[id])return false;
  const was=W.love[id].st; delete W.love[id]; (W.loveEx||(W.loveEx={}))[id]=Date.now();
  const nm=agent(id)?.name||id;
  const ev=was==='sevgili'?`Başkan ile ${nm} ilişkisi bitti${by==='user'?' (Başkan bitirdi)':' ('+nm+' bitirdi)'}.`:`${nm}, Başkan'a duyduğu aşkından vazgeçti.`;
  W.chron.push(ev); W.backDue=ev; saveW(); renderHudBar?.();
  if(!quiet)sysNote(by==='user'?`💔 ${fnm(nm)} ile ${was==='sevgili'?'ilişkiniz':'aranızdaki duygu'} bitti.`:`💔 ${fnm(nm)} ilişkiyi bitirdi.`);
  if(by==='user'&&!noReact&&S.model&&!fired(id)){const a=agent(id),ep=epoch;setTimeout(()=>{if(ep===epoch)runAgent(a,id,`Başkan seninle ${was==='sevgili'?'olan ilişkisini':'aranızdaki romantik gerginliği'} az önce bitirdi. Karakterine göre tepki ver (kırgın, öfkeli, hüzünlü ya da olgun); en fazla 2 cümle, romantik umut verme.`,99,true)},800)}
  return true;
}
// Kıskançlık: sevgiliyken başkasıyla özelden yazışırsan (özellikle medya yollarsan) sevgilin fark eder ve sana özelden yazabilir
function jealous(chat,text){
  const pid=partnerId(); if(!pid||isGroup(chat)||chat===pid||!S.model||S.outreach===false)return;
  const media=/^[📷🤳🎥📍🎤🎁💐📎] \[/u.test(text), now=Date.now();
  if(now-(W.jealT||0)<90000||Math.random()>(media?0.85:0.4))return;
  W.jealT=now; saveW(); const a=agent(pid), o=agent(chat), ep=epoch; if(!a||!o)return;
  setTimeout(()=>{ if(ep!==epoch||fired(pid)||partnerId()!==pid)return;
    runAgent(a,pid,`Başkan'ın az önce ${o.name} ile özelden yazıştığını${media?' ve ona fotoğraf/medya gibi bir şey gönderdiğini':''} fark ettin (içeriği bilmiyorsun). Sevgilisi olarak kıskançlığını karakterine göre göster: iğneleyici, kırgın, sorgulayıcı ya da gizlemeye çalışan; en fazla 2 cümle, tehdit ya da şiddet yok.`,99,true)
  },5000+Math.random()*8000);
}
const LOVE_END=/ayrıl(alım|ıyoruz|dık|mak istiyorum)|ilişkimizi bitir|ilişkimiz bitti|bu iş bitti|seni sevmiyorum|artık sevgili değiliz|sevgilik bitti/i;
const LOVE_YES=/sevgili ol(alım|sana|ur musun|ur musun)|sevgilim ol|seninle çıkmak|ben de seni seviyorum|bende seni seviyorum|evet.*sevgili/i;
function crushOut(reason,force){
  if(!W||!S.model||S.outreach===false&&!force)return false;
  if(partnerId()){return false}                                                // ilişkin varken başkası aşk ilan etmez
  const now=Date.now(); if(!force&&(now-(W.crushT||0)<150000||Math.random()>0.3))return false;
  const love=W.love||(W.love={}), dm=id=>msgs(id).filter(m=>m.who==='user').length;
  const pool=S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)&&!love[a.id]&&!(W.loveEx||{})[a.id]&&!unread[a.id]&&(force||dm(a.id)>=3||loyOf(a.id)>=75)
    &&!(W.rels||[]).some(r=>(r.a===a.id||r.b===a.id)&&/aşk|flört|sevgili|evli|romant/i.test(r.tur||'')));
  if(!pool.length)return false;
  let r=Math.random()*pool.reduce((t,a)=>t+1+dm(a.id)+loyOf(a.id)/25,0), a=pool[0];
  for(const p of pool){r-=1+dm(p.id)+loyOf(p.id)/25;if(r<=0){a=p;break}}
  love[a.id]={st:'itiraf',t:now}; W.crushT=now; saveW(); const ep=epoch;
  setTimeout(()=>{
    if(ep!==epoch||fired(a.id))return;
    runAgent(a,a.id,`Zamanla kullanıcıya karşı gizli bir hayranlık ve aşk beslemeye başladın (son gelişme: ${reason}). Bu mesajda duygunu ona ÖZELDEN ilan et: samimi, içten, karakterine göre çekingen ya da cesur; iş ilişkisinin riskini de hissettir. En fazla 2-3 cümle, cinsel içerik yok, selamlama klişesi yok.`,99,true);
  },3000+Math.random()*7000);
  return true;
}
function outreach(reason){
  if(!W||!S.model||S.outreach===false)return;
  const now=Date.now(); if(now-(W.outT||0)<70000)return;                       // sık yazmasınlar
  if(Math.random()>(W.calm?0.4:0.75))return;
  const pool=S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)&&loyOf(a.id)<(W.calm?45:52)&&!ctrls.has(a.id+'|'+a.id)&&!unread[a.id]&&msgs(a.id).slice(-1)[0]?.who!==a.id);
  if(!pool.length)return;
  let r=Math.random()*pool.reduce((s,a)=>s+(60-loyOf(a.id)),0), a=pool[0];
  for(const p of pool){r-=60-loyOf(p.id);if(r<=0){a=p;break}}
  W.outT=now; saveW(); const ep=epoch;
  setTimeout(()=>{
    if(ep!==epoch||fired(a.id))return;
    runAgent(a,a.id,`Şu gelişme oldu: ${reason}. Başkan'la çıkarların çatışıyor ya da karşı safta duruyorsun (sadakatin ${loyOf(a.id)}/100). Başkan sana yazmadı; sen kendiliğinden ONA ÖZELDEN YAZ. ${W.calm?'Sakin dönemdesin: kibar ama net bir itiraz, talep ya da kaygı ilet.':'Karakterine göre tek bir şey yap: pazarlık, ittifak teklifi, imalı tehdit, sızdırma uyarısı, şantaj imalı pazarlık, ya da yumuşak barış mesajı.'} En fazla 2 cümle, selamlamasız, doğrudan mesele.`,99,true);
  },3000+Math.random()*9000);
}
async function backTurn(a,chat,hint){
  const ep=epoch;
  const res=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),
    body:JSON.stringify({model:S.model,messages:buildMessages(a,chat,hint),stream:false,max_tokens:160})});
  if(!res.ok)throw new Error('HTTP '+res.status);
  let t=((await res.json()).choices?.[0]?.message?.content||'').trim().replace(/^\[[^\]]*\]:?\s*/,'');
  if(ep!==epoch)throw new Error('stale');
  t=clean(t); if(!t)return;
  pushMsg(chat,{who:a.id,text:t,t:Date.now()}); touchedChats.add(chat); refresh();
}
async function backConv(c){
  const A=agent(c.a),B=agent(c.b); if(!A||!B||A===B||A.id==='gm'||B.id==='gm')return;
  const chat=dmId(A.id,B.id), n=Math.min(4,Math.max(2,parseInt(c.mesaj_sayisi)||3));
  for(let i=0;i<n;i++){
    const sp=i%2?B:A;
    await backTurn(sp,chat,i===0?`Konu/niyet: ${c.konu||'duruma dair'}. Bu özel yazışmayı sen başlat veya sürdür; ${(sp===A?B:A).name}'a kısa bir mesaj yaz.`:null);
  }
}
// Ajanların kurduğu/sürdürdüğü gizli grup: üyeler sırayla yazar, hepsi öncekileri görür.
async function backGroup(c){
  const ids=[...new Set((c.uyeler||[]).filter(x=>agent(x)&&x!=='gm'))];
  let g=c.id&&bgroup(c.id);
  if(!g){
    if(ids.length<3)return;
    g={id:'bg:'+(String(c.ad||'grup').toLowerCase().replace(/[^a-z0-9çğıöşü]+/g,'-').slice(0,24)||'grup')+'-'+Date.now().toString(36).slice(-4),
       name:String(c.ad||'Gizli grup').slice(0,40),tur:['koalisyon','sosyal','is','dedikodu'].includes(c.tur)?c.tur:'is',purpose:String(c.amac||'sohbet').slice(0,120),members:ids.slice(0,6)};
    if(W.calm&&g.tur==='koalisyon')g.tur='is';
    (W.bgroups||(W.bgroups=[])).push(g); saveW();
    pushMsg(g.id,{who:'gm',act:true,text:`👥 ${fnm(agent(g.members[0]).name)} "${g.name}" grubunu kurdu (${g.tur}): ${g.members.slice(1).map(x=>fnm(agent(x).name)).join(', ')} eklendi.`,t:Date.now()});
  }else{
    const add=ids.filter(x=>!g.members.includes(x)).slice(0,6-g.members.length);
    if(add.length){g.members.push(...add);saveW();pushMsg(g.id,{who:'gm',act:true,text:`👥 Gruba eklendi: ${add.map(x=>fnm(agent(x).name)).join(', ')}.`,t:Date.now()})}
  }
  const n=Math.min(6,Math.max(3,parseInt(c.mesaj_sayisi)||4));
  const mem=g.members.map(agent).filter(Boolean);
  // son konuşan kişiden sonrakiyle başla ki sıra dönsün
  const lastW=[...(M[g.id]||[])].reverse().find(m=>!m.act)?.who;
  let start=Math.max(0,mem.findIndex(x=>x.id===lastW)+1);
  for(let i=0;i<n;i++){
    const sp=mem[(start+i)%mem.length];
    await backTurn(sp,g.id,i===0?`Konu/niyet: ${c.amac||g.purpose}. Gruba kısa bir mesaj yaz (grubu sen başlatıyorsan açılış yap, sürdürüyorsan önceki mesajlara cevap ver).`:null);
  }
}
async function backstage(reason){
  if(!W||!S.model||backBusy)return; backBusy=true; W.backDue=false; const ep=epoch;
  try{
    const roster=S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)).map(a=>`${a.id}: ${a.name} (${a.role})${W.calm?'':' | gizli gündem: '+a.secret}`).join('\n');
    const all=[];for(const k in M)if(!isBack(k))for(const m of M[k])all.push({k,m});
    all.sort((x,y)=>x.m.t-y.m.t);
    const tr=all.slice(-12).map(({k,m})=>`[${chatName(k)}] ${m.who==='user'?'BAŞKAN':agent(m.who)?.name}: ${m.text.slice(0,200)}`).join('\n');
    const groups=(W.bgroups||[]).map(g=>`${g.id}: "${g.name}" [${g.tur}] üyeler: ${g.members.join(', ')} | amaç: ${g.purpose} | son mesaj: ${(M[g.id]||[]).filter(m=>!m.act).slice(-1).map(m=>fnm(agent(m.who)?.name)+': '+m.text.slice(0,80)).join('')}`).join('\n')||'(henüz yok)';
    const prompt=`Sen bir holding rol yapma oyununun yönetmenisin. Başkan'ın (kullanıcı) GÖRMEDİĞİ özel yazışmaları planla. Üç biçim var:\n1) "konusmalar": iki ajan arasında ikili yazışma (haber sızdırma, dedikodu, danışma, koordinasyon).\n2) "gruplar": ajanların kendi kurduğu veya sürdürdüğü gizli WhatsApp grupları. Tür: "koalisyon" (çıkar ittifakı: oy blokları, YK dengesi, birlikte hareket; zamanla büyüyebilir), "sosyal" (iş dışı özel muhabbet: yemek, maç, aile, hobi), "dedikodu" (kim kiminle, kim neyi gizliyor; söylenti paylaşımı) veya "is" (proje koordinasyonu).\n3) "iliskiler": ajanlar arasındaki kişisel bağ katmanı. Örnek türler: flört, gizli ilişki, evli, ayrıldı, tek taraflı hayranlık, kıskançlık, rekabet, akıl hocası, dostluk; bitiyorsa tur:"bitti". Romantik içerik ölçülü ve imalı olsun, cinsel içerik YOK; yavaş ve inandırıcı ilerlet (kimse bir günde evlenmez), mevcut ilişkileri geliştir veya çatıştır. Mevcut bir ilişkisi olan çiftler özel yazışmalarında buna uygun konuşur. En fazla 2 ilişki güncellemesi.${W.calm?' (Sakin senaryoda sadece dostluk ve masum flört.)':''} Mevcut bir grubu sürdürmek için "id" yaz (yeni üye eklemek için "uyeler"e ekle); yeni grup için "id" boş bırak ve "ad" ver. Bir grup 3-5 üyeli olsun, üyeler mantıklı bir ortak payda ile seçilsin.\n${W.calm?'BU SAKİN BİR SENARYO: sadece "sosyal" ve "is" türleri; entrika veya koalisyon yok.':'Gizli gündemlere ve duruma uygun, inandırıcı seçimler yap; koalisyonlar durum olgunlaştıkça kurulsun, her turda zorunlu değil.'} Mantıklı bir sebep yoksa boş liste döndür. Toplam en fazla 3 etkinlik (konuşma + grup). SADECE JSON döndür:\n{"konusmalar":[{"a":"id","b":"id","konu":"kısa niyet/konu","mesaj_sayisi":3}],"gruplar":[{"id":"","ad":"grup adı","tur":"koalisyon|sosyal|is","uyeler":["id","id","id"],"amac":"kısa amaç","mesaj_sayisi":4}],"iliskiler":[{"a":"id","b":"id","tur":"flört","not":"kısa not"}]}\n\nKADRO:\n${roster}\nMEVCUT GİZLİ GRUPLAR:\n${groups}\nMEVCUT İLİŞKİLER: ${(W.rels||[]).map(r=>`${r.a}↔${r.b}: ${r.tur}${r.not?' ('+r.not+')':''}`).join('; ')||'(henüz yok)'}\nSENARYO: ${W.brief}\nDURUM: ${hudLine()}\nBİLİNEN GELİŞMELER: ${(W.chron||[]).slice(-6).join(' | ')}\nSON YAZIŞMALAR:\n${tr}\nTETİKLEYEN: ${reason||'Genel gidişat'}`;
    const res=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),body:JSON.stringify({model:S.model,messages:[{role:'user',content:roleBlock()+prompt}],stream:false,max_tokens:700})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const txt=(await res.json()).choices?.[0]?.message?.content||'';
    if(ep!==epoch){backBusy=false;return}
    const j=JSON.parse(txt.slice(txt.indexOf('{'),txt.lastIndexOf('}')+1));
    const convs=(j.konusmalar||[]).slice(0,2), grps=(j.gruplar||[]).slice(0,2), rl=(j.iliskiler||[]).slice(0,2);
    rl.forEach(r=>{try{setRel(r)}catch(e){}});
    if(convs.length||grps.length||rl.length){
      await Promise.all([...convs.map(c=>backConv(c).catch(()=>{})),...grps.slice(0,Math.max(1,3-convs.length)).map(g=>backGroup(g).catch(()=>{}))]);
      touchedChats.forEach(overhear); touchedChats.clear();
      gmTick('Ajanlar arasında özel yazışmalar oldu; bunların DIŞA yansıyan sonuçlarını (söylenti, hamle, ruh hali; koalisyon kurulduysa YK oy dengesine etkisi) değerlendir, gizli planları açığa çıkarma.');
    }
  }catch(e){}
  backBusy=false;
}
$('pnl').addEventListener('click',e=>{
  const id=e.target.id, close=()=>$('pnl').classList.remove('open');
  const lb=e.target.closest?.('[data-lv]'); if(lb){const [k,who]=lb.dataset.lv.split(':');close();if(k==='yes')startLove(who);else endLove(who,'user');return}
  if(id==='pb'){close();backstage('Kullanıcı perde arkasını çalıştırmak istedi.')}
  else if(id==='pl'){close();backstage('Kullanıcı ilişki dinamiklerini ilerletmek istedi: flört, gizli ilişki, kıskançlık, kırgınlık, ittifak ve ayrılıklar. Mevcut ilişkilere göre ikili yazışmalar ve gruplar kur, ilişki güncellemeleri yap.')}
  else if(id==='po'){close();triggerOpportunity()}
  else if(id==='plv'){close();if(!crushOut('Panelden istendi',true))sysNote('Şu an kimse uygun değil (bir iltifat bekleyen biri var ya da herkes başka bir ilişkide). Önce biriyle özelden biraz sohbet et.')}
  else if(id==='pk'){close();draftResolution()}
});

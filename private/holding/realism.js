/* realism.js · Soylu Holding gerçekçilik katmanı
   finans modeli · takvim · karar defteri · belgeler · sözler · sızıntı · telefon/bildirim · kişisel sahneler · kayıt yuvaları
   index.html'deki global değişkenleri (W, M, S, agent, pushMsg...) kullanır ve bazı fonksiyonları sarar. */
(()=>{
/* ---------- yardımcılar ---------- */
const RATE={g:54,y:12,r:-36};                    // iştirak başına aylık nakit katkısı (M₺) — durum rengine göre
const num=(s,d)=>{const m=String(s??'').match(/-?\d+(?:[.,]\d+)?/);return m?parseFloat(m[0].replace(',','.')):d};
const fx=(v,d=0)=>(Math.round(v*10**d)/10**d).toFixed(d).replace('.',',');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const day=t=>Math.floor(t/1440);
const hmOf=t=>{const m=((t%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const lbl=t=>DAYS[day(t)%7]+' '+hmOf(t);
const hit=()=>isBoss()?'Başkanım':'Efendim';
const live=id=>id&&id!=='gm'&&agent(id)&&!fired(id);
const kvh=(k,v)=>`<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>`;

/* ---------- CSS + arayüz iskeleti ---------- */
const st=document.createElement('style');
st.textContent=`
#rxtoasts{position:fixed;right:14px;bottom:80px;z-index:20;display:flex;flex-direction:column;gap:8px;max-width:320px}
.rxt{background:#202c33;border-left:3px solid #00a884;border-radius:8px;padding:8px 12px;box-shadow:0 6px 20px #0008;cursor:pointer;font-size:13.5px;animation:rxin .25s}
.rxt b{display:block;font-size:12.5px;color:#00a884}
@keyframes rxin{from{transform:translateX(30px);opacity:0}}
#rxcall{position:fixed;inset:0;background:#000a;z-index:30;display:none;align-items:center;justify-content:center}
#rxcall.open{display:flex}
#rxcall .box{background:#111b21;border-radius:16px;padding:22px;width:340px;max-width:92%;text-align:center}
#rxcall .big{width:78px;height:78px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;font-size:32px;font-weight:700;color:#fff}
#rxcall.ring .big{animation:pulse 1s infinite}
#rxcall .row2{display:flex;gap:10px;margin-top:16px}
#rxcall .row2 button{flex:1;padding:11px;border-radius:24px;font-weight:700}
#rxcall .opts{display:flex;flex-direction:column;gap:8px;margin-top:14px}
#rxcall .opts button{padding:10px 12px;border-radius:12px;background:#202c33;color:#e9edef;text-align:left;font-size:13.5px}
#rxcall .opts button:hover{background:#2a3942}
#rxcall .ok{background:#00a884;color:#06130f}#rxcall .no{background:#e5484d;color:#fff}
.rxdoc{white-space:pre-wrap;background:#1a252c;border-radius:8px;padding:12px;font-size:13.5px;margin-top:10px;max-height:60vh;overflow:auto}
.rxrow{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);font-size:13.5px;align-items:center}
.rxrow button{font-size:11.5px;padding:2px 7px;background:#2a3942;border-radius:6px;margin-left:4px}
.rxrow button:hover{background:#34454f}
.rxrow .l{cursor:pointer}
`;
document.head.appendChild(st);
const toasts=document.createElement('div');toasts.id='rxtoasts';document.body.appendChild(toasts);
const callov=document.createElement('div');callov.id='rxcall';document.body.appendChild(callov);

/* ---------- bildirim, ses, sekme başlığı ---------- */
function beep(f=880,d=.12){try{const c=beep.c||(beep.c=new(window.AudioContext||window.webkitAudioContext)());const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.value=.04;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d)}catch(e){}}
function notify(title,body,chat){
  if(S.rxSound!==false)beep();
  const t=document.createElement('div');t.className='rxt';t.innerHTML=`<b>${esc(title)}</b>${esc(String(body).slice(0,110))}`;
  t.onclick=()=>{t.remove();if(chat&&(isGroup(chat)||agent(chat)||isChan(chat)||isBack(chat)))openChat(chat)};
  toasts.appendChild(t);setTimeout(()=>t.remove(),7000);while(toasts.children.length>3)toasts.firstChild.remove();
  try{if(S.rxNotify&&document.hidden&&Notification.permission==='granted')new Notification(title,{body:String(body).slice(0,140)})}catch(e){}
}
function setTitle(){const n=Object.values(unread).reduce((s,v)=>s+(v||0),0);document.title=(n?`(${n}) `:'')+'Soylu Holding'}
{const _rl=renderList;renderList=function(){_rl();try{setTitle()}catch(e){}}}

/* ---------- dünya yardımcıları ---------- */
function news(t){pushMsg('ch_haber',{who:'gm',text:'📰 '+t,t:Date.now()});W.chron=[...(W.chron||[]),t].slice(-25)}
function gmNote(chat,text){pushMsg(chat,{who:'gm',act:true,text,t:Date.now()})}
function dm(id,text){if(!live(id))return;pushMsg(id,{who:id,text,t:Date.now()});notify(agent(id).name,text,id)}
function loyAdd(id,d){if(!live(id))return;W.loy=W.loy||{};W.loy[id]=clamp(Math.round(loyOf(id)+d),0,100)}
function susAdd(id,d){if(!live(id))return;W.sus=W.sus||{};W.sus[id]=clamp((W.sus[id]||0)+d,0,100)}
function crisis(t){const h=W.hud;if(!h.krizler.includes(t))h.krizler.push(t.slice(0,110));W.chron.push(t);W.backDue=t}

/* ---------- finans modeli ---------- */
const isum=()=>(W.hud.istirakler||[]).reduce((s,i)=>s+(RATE[i.d]??0),0);
function ensure(){
  if(!W||!W.hud)return false;
  if(W.fin)return true;
  const f=W.hud.finans, favok0=1320, bx=num(f.borc,3.5);
  W.fin={nakit:num(f.nakit,600),favok0,borc:bx*favok0,faiz:W.calm?7:10.5,gider:19,pv:num(f.piyasa,3),hisse:num(f.hisse,80),
    isum0:isum(),lastNet:null,lastParts:[],month:Math.floor(clkNow()/43200),tier:null,lastTemettu:null,lastBank:-999,lastAnk:-999,sceneDay:-99,sceneLog:[]};
  W.dec=W.dec||[];W.docs=W.docs||[];W.pend=W.pend||[];W.prom=W.prom||[];W.cal=W.cal||[];
  return true;
}
const favok=()=>Math.max(240,W.fin.favok0+12*(isum()-W.fin.isum0));
const borcX=()=>Math.max(.3,W.fin.borc/favok());
const faizM=()=>W.fin.borc*W.fin.faiz/100/12;
function acil(){
  const neg=(W.hud.istirakler||[]).reduce((s,i)=>s+Math.min(0,RATE[i.d]??0),0);
  return Math.max(30,W.fin.gider+faizM()-neg+(nextVade()-clkNow()<43200?W.fin.borc*.1:0));
}
const TIERS=['CC','CCC','CCC+','B','B+','BB','BB+'];
function tierNow(){const b=borcX();return W.fin.nakit<0?'CC':b>7?'CCC':b>5.5?'CCC+':b>4.2?'B':b>3.2?'B+':b>2.4?'BB':'BB+'}
function sync(pct){   // modeldeki sayıları panele (hud) yaz
  const f=W.hud.finans,F=W.fin;
  f.nakit=fx(F.nakit)+' M₺'; f.borc=fx(borcX(),1)+'x'; f.acil=fx(acil())+' M₺'; f.piyasa=fx(F.pv,1)+' Mr ₺';
  if(pct!==undefined&&pct!==null)f.hisse=`${fx(F.hisse,2)} TL (${pct>=0?'↗':'↘'} %${fx(Math.abs(pct)*100,1)})`;
  const t=tierNow();
  if(F.tier===null)F.tier=t;
  else if(t!==F.tier){
    const worse=TIERS.indexOf(t)<TIERS.indexOf(F.tier);
    news(`Derecelendirme kuruluşu holdingin notunu ${F.tier}'den ${t}'ye ${worse?'düşürdü':'yükseltti'}.`);
    f.rating=t+(worse?' (Negatif izleme)':' (Pozitif)'); F.tier=t;
    dm('aylin',worse?`${hit()}, rating ${t}'ye düştü; bankalarla yeniden pazarlık gerekecek.`:`${hit()}, rating ${t}'ye yükseldi; refinansman için iyi bir pencere.`);
    if(worse)loyAdd('cem',-2);
  }
}
function adopt(){   // GM panelde nakit/borç/hisse değiştirdiyse modeli ona uydur
  const f=W.hud.finans,F=W.fin; if(!F)return;
  F.nakit=num(f.nakit,F.nakit); F.borc=num(f.borc,borcX())*favok(); F.hisse=num(f.hisse,F.hisse); F.pv=num(f.piyasa,F.pv);
}
{const _g=gmTick;gmTick=async function(r){const b=W&&W.hud?JSON.stringify(W.hud.finans):'';await _g(r);try{if(W&&W.fin&&JSON.stringify(W.hud.finans)!==b)adopt()}catch(e){}}}

function nextVade(){const d=day(clkNow());for(let k=d;k<d+400;k++)if(k%180===170)return k*1440+540;return clkNow()+1e6}

/* ---------- belgeler ---------- */
function addDoc(from,title,body){
  const d={id:'d'+Date.now()+Math.floor(Math.random()*99),from,title,body,t:clkNow()};
  W.docs=[d,...(W.docs||[])].slice(0,30);
  if(live(from)){pushMsg(from,{who:from,text:`📎 [Belge gönderildi: ${title}]`,t:Date.now()});notify(agent(from).name,'📎 '+title,from)}
  return d;
}
function showDoc(id){
  const d=(W.docs||[]).find(x=>x.id===id);if(!d)return;
  $('ngc').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">📎 ${esc(d.title)}</b><button class="ib" id="rxx">✕</button></div><div class="mut">${esc(agent(d.from)?.name||'')} · ${lbl(d.t)}</div><div class="rxdoc">${esc(d.body)}</div>`;
  $('ng').classList.add('open');$('rxx').onclick=()=>$('ng').classList.remove('open');
}
function monthDoc(k){
  const F=W.fin;
  return addDoc('deniz',`Aylık Kapanış Raporu · ${k}. ay`,
`SOYLU HOLDİNG A.Ş. · AYLIK KAPANIŞ RAPORU
Dönem: ${k}. ay sonu (${lbl(clkNow())})

İŞTİRAK NAKİT KATKILARI
${(F.lastParts||[]).map(p=>`  ${p.ad}: ${p.v>=0?'+':''}${fx(p.v,1)} M₺`).join('\n')}

Faiz gideri: -${fx(faizM(),1)} M₺
Genel yönetim gideri: -${fx(F.gider,1)} M₺
NET NAKİT HAREKETİ: ${F.lastNet>=0?'+':''}${fx(F.lastNet,1)} M₺

Kapanış nakit: ${fx(F.nakit)} M₺
Toplam borç: ${fx(F.borc)} M₺ · Net borç/FAVÖK: ${fx(borcX(),1)}x
Borçlanma maliyeti: %${fx(F.faiz,1)}
30 gün acil nakit ihtiyacı: ${fx(acil())} M₺

Muhasebe notu: ${F.nakit<acil()?'Nakit, 30 günlük ihtiyacın altında; acil likidite planı önerilir.':'Likidite şu an yeterli.'} Ilişkili taraf kayıtları ay sonu mutabakatından geçmiştir.`);
}

/* ---------- aylık kapanış ---------- */
function monthClose(k,log){
  const F=W.fin;
  const parts=(W.hud.istirakler||[]).map(i=>({ad:i.ad,v:(RATE[i.d]??0)*rnd(.8,1.2)}));
  const ist=parts.reduce((s,p)=>s+p.v,0), net=ist-faizM()-F.gider;
  F.nakit+=net;F.lastNet=net;F.lastParts=parts;
  const pct=clamp(net/540+rnd(-.02,.02),-.1,.1); F.hisse*=1+pct;F.pv*=1+pct;
  sync(pct);
  monthDoc(k);
  log.push(`Ay kapanışı: net nakit ${net>=0?'+':''}${fx(net,1)} M₺`);
  const d=day(clkNow()), bx=borcX();
  if(F.nakit<0&&!F.dflt){F.dflt=true;
    crisis('Nakit tükendi: bankalar çapraz temerrüt ihtarı gönderdi');
    news('Holdingin nakdi tükendi; bankalar çapraz temerrüt ihtarı gönderdi.');
    addDoc('cem','Çapraz Temerrüt İhtarı',`Sayın Yönetim Kurulu,\nKredi sözleşmesi uyarınca nakit yetersizliği temerrüt sebebidir. ${fx(Math.abs(F.nakit))} M₺ açık kapatılmadığı takdirde hisse rehni ve sendikasyon hesapları üzerinde tedbir uygulanacaktır.\n\nBanka Konsorsiyumu Temsilcisi\nCem Arıkan`);
  }else if(F.nakit>=0)F.dflt=false;
  if(bx>4.5&&d-F.lastBank>=45){F.lastBank=d;
    addDoc('cem','Covenant Uyarı Mektubu',`Net borç/FAVÖK oranınız ${fx(bx,1)}x ile sözleşme eşiği olan 4,5x'in üzerindedir. 30 gün içinde ek teminat, kısmi erken ödeme ya da hisse rehni önerinizi bekliyoruz.\n\nCem Arıkan`);
    ring({who:'cem',text:`Kaldıraç oranınız ${fx(bx,1)}x; covenant eşiğini aştınız. Görüşmemiz gerekiyor.`,
      hint:`Net borç/FAVÖK ${fx(bx,1)}x ile covenant eşiğini aştı. Bankanın temsilcisi olarak Başkan'ı aradın: ek teminat, erken ödeme ya da hisse rehni iste; soğuk ve kibar ol, en fazla 3 cümle.`,loy:[1,-3]});
  }else if(F.nakit<acil()&&live('aylin')&&!W.calm){
    ring({who:'aylin',text:`${hit()}, nakit ${fx(F.nakit)} M₺; 30 günlük ihtiyacımız ${fx(acil())} M₺. Acil karar gerekiyor.`,
      hint:`Nakit ${fx(F.nakit)} M₺, 30 günlük ihtiyaç ${fx(acil())} M₺. CFO olarak endişeni açık söyle ve somut bir öneri (varlık satışı, yeni kredi, temettü erteleme) sun; en fazla 3 cümle.`,loy:[2,-2]});
  }
  if(/soğuk|vdk|mesafeli/i.test(W.hud.itibar.ankara||'')&&d-F.lastAnk>=40&&Math.random()<.35&&live('hakan')){F.lastAnk=d;
    ring({who:'hakan',text:`${hit()}, Ankara'dan bazı sinyaller var; telefonda anlatmak istemem.`,
      hint:`Ankara'dan hoş olmayan sinyaller aldın (VDK, ihale, soğuma). Başkan'a ima dolu, bedelini de hissettiren kısa bir bilgi ver; en fazla 3 cümle.`,loy:[1,-2]});
  }
  if(k%3===0&&live('nazli')&&!W.calm){
    const red=(W.hud.istirakler||[]).find(i=>i.d==='r');
    addDoc('nazli','İç Denetim Bulgu Notu',`Konu: ${red?red.ad:'Grup'} · çeyreklik denetim\nBulgu: Harcama onay matrisine aykırı iki ödeme ve gecikmiş mutabakat tespit edilmiştir.\nRisk: Orta. Denetim Komitesi'ne (Prof. Dr. Orhan Aksoy) raporlanmıştır.\n\nNazlı Erdoğan, İç Denetim Müdürü`);
  }
}

/* ---------- takvim ---------- */
const CAL=[
  {id:'yk',ad:'Haftalık YK toplantısı',when:d=>d%7===3?840:null,kind:'yk'},
  {id:'butce',ad:'Aylık bütçe & nakit toplantısı',when:d=>d%30===1?600:null,kind:'butce'},
  {id:'ppk',ad:'Merkez Bankası PPK kararı',when:d=>d%30===14?840:null,kind:'ppk'},
  {id:'bilanco',ad:'Çeyrek sonu bilanço / KAP',when:d=>d%90===85?600:null,kind:'bilanco'},
  {id:'gk',ad:'Olağan Genel Kurul',when:d=>d%360===120?600:null,kind:'gk'},
  {id:'temettu',ad:'Temettü ödeme tarihi',when:d=>d%360===150?540:null,kind:'temettu'},
  {id:'vade',ad:'Sendikasyon kredisi taksit vadesi',when:d=>d%180===170?540:null,kind:'vade'},
];
function occ(o,n){
  const out=[];
  for(let d=day(o);d<=day(n);d++)for(const c of CAL){const m=c.when(d);if(m===null)continue;const t=d*1440+m;if(t>o&&t<=n)out.push({t,kind:c.kind,ad:c.ad})}
  (W.cal||[]).forEach(u=>{if(!u.done&&u.t>o&&u.t<=n)out.push({t:u.t,kind:'user',ad:u.text,u})});
  return out.sort((a,b)=>a.t-b.t);
}
function fireEv(e,log){
  const F=W.fin;
  if(e.kind==='yk'){ykEvent(log)}
  else if(e.kind==='butce'){
    gmNote('g_exco','📅 Aylık bütçe ve nakit toplantısı.');
    if(F.lastNet!==null)dm('aylin',`${hit()}, geçen ay net nakit hareketi ${F.lastNet>=0?'+':''}${fx(F.lastNet,1)} M₺ oldu; nakit ${fx(F.nakit)} M₺, 30 günlük ihtiyaç ${fx(acil())} M₺.`);
    else dm('aylin',`${hit()}, bütçe toplantısı için ilk aylık kapanışı bekliyorum; nakit şu an ${fx(F.nakit)} M₺.`);
  }else if(e.kind==='ppk'){
    const d=[-2,-1,-1,0,0,0,1,1,2][Math.floor(Math.random()*9)];
    F.faiz=clamp(F.faiz+d*.4,4,18);
    news(`Merkez Bankası PPK ${d===0?'politika faizini sabit tuttu':`politika faizini ${Math.abs(d)*250} baz puan ${d>0?'artırdı':'indirdi'}`}; holdingin ortalama borçlanma maliyeti %${fx(F.faiz,1)} oldu.`);
    log.push(`PPK: faiz ${d>0?'arttı':d<0?'düştü':'sabit'}`);
    if(d>=2)dm('aylin',`${hit()}, faiz artışı borç servisimizi ağırlaştırdı; aylık faiz gideri ${fx(faizM(),1)} M₺ oldu.`);
  }else if(e.kind==='bilanco'){
    const pct=(F.lastNet===null||F.lastNet>=0)?rnd(.01,.05):-rnd(.02,.07);
    F.hisse*=1+pct;F.pv*=1+pct;sync(pct);
    const nb=`Holding çeyrek sonuçlarını KAP'a bildirdi: nakit ${fx(F.nakit)} M₺, net borç/FAVÖK ${fx(borcX(),1)}x; hisse %${fx(Math.abs(pct)*100,1)} ${pct>=0?'yükseldi':'düştü'}.`;
    news(nb);gmNote('g_genel','📅 '+nb);log.push('Bilanço KAP\'a açıklandı');
    addDoc('tolga','Çeyrek Finansal Rapor Özeti (KAP)',`SOYLU HOLDİNG A.Ş. · ÇEYREK SONU\nNakit: ${fx(F.nakit)} M₺\nToplam borç: ${fx(F.borc)} M₺ · Net borç/FAVÖK: ${fx(borcX(),1)}x\nYıllıklandırılmış FAVÖK: ${fx(favok())} M₺\nBorçlanma maliyeti: %${fx(F.faiz,1)}\nKredi notu: ${W.hud.finans.rating}\nHisse: ${W.hud.finans.hisse}\n\nYatırımcı İlişkileri · Tolga Başar`);
  }else if(e.kind==='gk'){
    const od=F.lastTemettu!==null&&day(clkNow())-F.lastTemettu<360;
    news(od?'Olağan Genel Kurul toplandı; temettü dağıtımı onaylandı, toplantı sakin geçti.':'Olağan Genel Kurul toplandı; temettü çıkmadığı için küçük hissedarlar tepkili.');
    if(!od){loyAdd('orhan',-2);loyAdd('tolga',-2);loyAdd('kerem',-2);W.hud.itibar.medya='Küçük hissedar tepkisi'}
    log.push('Genel kurul yapıldı');
  }else if(e.kind==='temettu'){
    dm('tolga',F.lastTemettu!==null&&day(clkNow())-F.lastTemettu<60?`${hit()}, temettü ödemesi yapıldı; hissedarlar memnun.`:`${hit()}, bugün temettü ödeme tarihiydi ama dağıtım kararı yok; paneldeki "Temettü dağıt" ile ödeyebilirsiniz.`);
  }else if(e.kind==='vade'){
    const pay=Math.round(F.borc*.1);
    if(F.nakit>=pay){F.nakit-=pay;F.borc-=pay;sync();news(`Sendikasyon kredisinin ${pay} M₺'lık taksiti zamanında ödendi.`);log.push(`Kredi taksiti ödendi (${pay} M₺)`)}
    else{
      crisis('Kredi taksiti ödenemedi: bankalar ihtar çekti');news(`Holding ${pay} M₺'lık sendikasyon taksitini ödeyemedi; bankalar ihtar gönderdi.`);log.push('Kredi taksiti ödenemedi');
      F.borc+=pay*.05;F.faiz=clamp(F.faiz+.8,4,18);sync();
      addDoc('cem','Taksit Temerrüt Bildirimi',`${fx(pay)} M₺ tutarındaki taksit vadesinde ödenmemiştir. Gecikme faizi uygulanacak, temerrüt süreci başlatılabilir.\n\nCem Arıkan`);
      ring({who:'cem',text:`${fx(pay)} M₺'lık taksit ödenmedi. Bu bir temerrüt bildirimidir.`,hint:`Holding ${fx(pay)} M₺'lık taksiti ödemedi. Soğuk ve tehditkâr biçimde Başkan'dan ödeme planı iste; en fazla 3 cümle.`,loy:[0,-4]});
    }
  }else if(e.kind==='user'){e.u.done=true;dm('zeynep',`${hit()}, randevunuz: ${e.u.text}.`);log.push('Randevu: '+e.u.text)}
}

/* ---------- bekleyen sonuçlar (karar → zaman içinde gerçekleşen etkiler) ---------- */
function firePend(p,log){
  const F=W.fin;
  if(p.nakit)F.nakit+=p.nakit;
  if(p.hisse_pct){const pc=p.hisse_pct/100;F.hisse*=1+pc;F.pv*=1+pc;sync(pc)}else sync();
  for(const id in (p.sadakat||{}))loyAdd(id,p.sadakat[id]);
  news(p.olay);gmNote('g_genel','🔔 '+p.olay);notify('Gelişme',p.olay,'ch_haber');log.push(p.olay);
}
async function consequences(text){
  if(!S.model||W.calm&&false)return;
  const ep=epoch,ids=S.agents.filter(a=>live(a.id)).map(a=>a.id).join(',');
  const prompt=`Sen bir holding rol yapma oyununun olay motorusun. Aşağıdaki YK kararının ZAMAN İÇİNDE doğuracak 1-3 gerçekçi sonucunu planla (piyasa, banka, medya, sendika, aile). Küçük ve nedensel olsun${W.calm?', sakin senaryo: kriz uydurma':''}. SADECE JSON döndür:\n{"sonuclar":[{"gun":3,"olay":"kısa haber cümlesi","nakit":-30,"hisse_pct":-2,"sadakat":{"ajan_id":-4}}]}\ngun 1-45 arası; nakit -240..240 (M₺); hisse_pct -8..8; sadakat -12..12.\nAjan idleri: ${ids}\nKARAR: ${text}\nDURUM: ${hudLine()}`;
  try{
    const r=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),body:JSON.stringify({model:S.model,messages:[{role:'user',content:roleBlock()+prompt}],stream:false,max_tokens:500})});
    if(!r.ok)return;const tx=(await r.json()).choices?.[0]?.message?.content||'';if(ep!==epoch)return;
    const j=JSON.parse(tx.slice(tx.indexOf('{'),tx.lastIndexOf('}')+1));
    (j.sonuclar||[]).slice(0,3).forEach(s=>{
      if(!s||typeof s.olay!=='string')return;
      const sad={};for(const k in (s.sadakat||{}))if(live(k)&&isFinite(+s.sadakat[k]))sad[k]=clamp(+s.sadakat[k],-12,12);
      (W.pend||(W.pend=[])).push({due:clkNow()+clamp(parseInt(s.gun)||3,1,45)*1440+Math.floor(rnd(60,600)),olay:s.olay.slice(0,160),nakit:clamp(+s.nakit||0,-240,240),hisse_pct:clamp(+s.hisse_pct||0,-8,8),sadakat:sad});
    });saveW();if($('pnl').classList.contains('open'))renderHud();
  }catch(e){}
}

/* ---------- karar defteri + sızıntı ---------- */
function recordDec(text,auto){
  ensure();const n=(W.dec||[]).length+1;
  const d={no:`2026/${String(n).padStart(3,'0')}`,t:clkNow(),text:text.slice(0,200),oy:`${W.hud.yk.sen}-${W.hud.yk.muhalif}-${W.hud.yk.kararsiz}`,auto:!!auto};
  W.dec=[d,...(W.dec||[])].slice(0,40);
  W.chron.push(`Karar ${d.no}: ${d.text}`);W.chron=W.chron.slice(-25);
  decEffects(text);leakCheck(text);
  if(!auto)consequences(text);
  saveW();return d;
}
function decEffects(t){
  if(/rüşvet|insider|içeriden|ilişkili taraf|kara para|vergi kaçır|sahte/i.test(t)){
    loyAdd('sevgi',-4);loyAdd('orhan',-5);loyAdd('nazli',-4);susAdd('sevgi',5);W.hud.itibar.spk='İnceleme riski arttı';
    dm('sevgi',`${hit()}, bu karar TTK ve SPK açısından ağır risk taşıyor; gerekirse muhalefet şerhi düşmek zorunda kalırım.`);
  }
  if(/işten çıkar|kadro daral|toplu çıkış/i.test(t)){loyAdd('hatice',-6);loyAdd('selin',-3);loyAdd('ali',-2)}
  if(/zam|prim|ikramiye/i.test(t)){loyAdd('hatice',4);loyAdd('selin',3);loyAdd('ali',3)}
}
function leakCheck(text){
  if(W.calm)return;
  const mem=[...new Set([...(group('g_yk')?.members||[]),...(group('g_exco')?.members||[])])].filter(id=>live(id)&&id!=='faruk');
  const sus=mem.filter(id=>loyOf(id)<45&&Math.random()<(55-loyOf(id))/90);
  if(!sus.length)return;
  W.leaks=(W.leaks||0)+1;
  const short=text.length>70?text.slice(0,67)+'…':text;
  setTimeout(()=>{if(!W)return;
    news(`Kulis: Holding yönetiminde "${short}" konuşuldu; kaynaklar kararın içeriden sızdırıldığını söylüyor.`);
    W.hud.itibar.medya='Kulis haberleri: yönetimden sızıntı';
    dm('ece',`${hit()}, bir gazeteci "${short}" konusunu sordu; kaynak yönetim kurulundan biri gibi görünüyor.`);
    saveW();renderHudBar();
  },4000+Math.random()*6000);
}

/* ---------- sözler ---------- */
function promResolve(id,ok){
  const p=(W.prom||[]).find(x=>x.id===id);if(!p||p.st!=='open')return;
  p.st=ok?'kept':'broken';loyAdd(p.who,ok?6:-8);if(!ok)susAdd(p.who,6);
  W.chron.push(`Başkan ${fnm(agent(p.who).name)}'e verdiği sözü ${ok?'tuttu':'tutamadı'}: ${p.text}`);saveW();
}

/* ---------- telefon / sahne kartı ---------- */
const ringQ=[];let ringCur=null,ringTimer=null;
function ring(o){ringQ.push(o);if(!ringCur)nextRing()}
function nextRing(){
  const o=ringQ.shift();if(!o){ringCur=null;callov.classList.remove('open','ring');return}
  if(!live(o.who)){nextRing();return}
  ringCur=o;const a=agent(o.who),scene=!!o.kind;   // kind yoksa telefon çağrısı; 'scene' / 'invite' kart
  callov.innerHTML=`<div class="box"><div class="big" style="background:${a.color}">${esc(initial(a.name))}</div><b style="font-size:17px">${scene?esc(o.title||a.name):'📞 '+esc(a.name)+' arıyor…'}</b><div class="mut" style="margin:2px 0 8px">${esc(a.name)} · ${esc(a.role)}</div><div style="font-size:14.5px">${esc(o.text)}</div>${o.opts?`<div class="opts">${o.opts.map((p,i)=>`<button data-i="${i}">${esc(p)}</button>`).join('')}</div>`:`<div class="row2"><button class="no" id="rxno">${esc(o.no||(scene?'Bu sefer olmaz':'Reddet'))}</button><button class="ok" id="rxok">${esc(o.ok||(scene?'Git':'Aç'))}</button></div>`}</div>`;
  callov.classList.add('open');if(!scene)callov.classList.add('ring');
  if(!scene){beep(740,.15);setTimeout(()=>beep(740,.15),300)}else beep(620,.1);
  const done=ok=>{clearTimeout(ringTimer);callov.classList.remove('open','ring');ringCur=null;try{o.onAnswer?o.onAnswer(ok):answer(o,ok)}catch(e){console.error(e)}setTimeout(nextRing,300)};
  if(o.opts){callov.querySelectorAll('.opts button').forEach(b=>b.onclick=()=>done(+b.dataset.i))}
  else{$('rxok').onclick=()=>done(true);$('rxno').onclick=()=>done(false)}
  ringTimer=setTimeout(()=>{if(ringCur===o)done(o.opts?(o.def??o.opts.length-1):false)},o.opts?300000:scene?120000:40000);
}
function answer(o,ok){
  const a=agent(o.who);if(!a||!W)return;
  const [lo,ln]=o.loy||[3,-3];
  if(ok){
    loyAdd(o.who,lo);saveW();openChat(o.who);
    if(S.model)runAgent(a,o.who,o.hint,99,true);else pushMsg(o.who,{who:o.who,text:o.text,t:Date.now()});
    if(o.who==='fatma'&&o.kind==='scene')W.rumors=W.rumors||{};
  }else{
    loyAdd(o.who,ln);if(o.kind!=='scene')susAdd(o.who,3);
    pushMsg(o.who,{who:'gm',act:true,text:o.kind==='scene'?`🌙 Davete gitmedin (${clkHM()}).`:`📞 Cevapsız çağrı (${clkHM()}).`,t:Date.now()});
    dm(o.who,o.kind==='scene'?'Anladım, başka zaman.':`${hit()}, sonra tekrar ararım.`);
  }
  saveW();refresh();
}

/* ---------- kişisel sahneler ---------- */
const SCENES=[
  {id:'baba',who:'kerem',title:'Hastane koridoru',text:'Baba\'nın tahlilleri çıktı. Hastaneye gelecek misin? Yalnız kalmak istemiyorum.',hint:'Hastane koridorunda Başkan\'la karşılaşıyorsun; babanız Rıza Soylu\'nun durumundan ve miras kaygısından duygusal ama temkinli bahset. En fazla 3 cümle.',loy:[5,-4]},
  {id:'sofor',who:'mehmet',title:'Akşam yolu',text:'Başkanım, bu akşam eve kendim bırakayım; yolda bir derdiniz varsa dinlerim.',hint:'Arabada, akşam trafiğinde Başkan\'la baş başasın. Halk deyimleriyle, babacan bir sohbet aç; duyduğun bir şeyi ima et. En fazla 3 cümle.',loy:[4,-2]},
  {id:'cay',who:'fatma',title:'Çay ocağı',text:'Yavrum, akşam yemeği getirdim; ofiste hâlâ mısın? Biraz otur, bir şey yiyelim.',hint:'Çay ocağında Başkan\'a sıcak bir ikramla yaklaş ve binadan duyduğun bir dedikoduyu kendi sade diliyle anlat. En fazla 3 cümle.',loy:[4,-2]},
  {id:'yemek',who:'murat',title:'Akşam yemeği',text:'İş konuşmayacağız söz; akşam yemeğine çıkalım mı? Biraz rahatlarız.',hint:'Akşam yemeğinde Murat Kaya olarak rahat ve savunmasızsın; çıkarını belli etmeden samimi bir şeyler söyle. En fazla 3 cümle.',loy:[3,-2],not:'calm'},
  {id:'gece',who:'aylin',title:'Gece mesaisi',text:'Rakamlarda tutarsız bir şey gördüm; 10 dakikanız var mı? Ofisteyim.',hint:'Gece ofiste Başkan\'ı arıyorsun: nakit/borç rakamlarında dikkatini çeken bir kaygıyı net söyle. En fazla 3 cümle.',loy:[4,-3]},
  {id:'dogum',who:'zeynep',title:'Küçük bir iltimas',text:'Yarın annenizin doğum günü, kaçırmayın istedim. Çiçek ve hediye ayarlayayım mı?',hint:'Başkan\'ın annesinin doğum gününü hatırlatan özel sekreter olarak sıcak ve düzenli konuş; çiçek/hediye öner. En fazla 2 cümle.',loy:[3,-1]},
];
function maybeScene(o,n){
  const F=W.fin;
  for(let d=Math.max(day(o),day(n)-3);d<=day(n);d++){
    const t=d*1440+1140;if(!(t>o&&t<=n))continue;
    if(d-F.sceneDay<5||Math.random()>.6)continue;
    const pool=SCENES.filter(s=>live(s.who)&&!(s.not==='calm'&&!W.calm&&false)&&!F.sceneLog.slice(-4).includes(s.id));
    if(!pool.length)continue;
    const s=pool[Math.floor(Math.random()*pool.length)];
    F.sceneDay=d;F.sceneLog.push(s.id);
    ring({who:s.who,kind:'scene',title:s.title,text:s.text,hint:s.hint,loy:s.loy});
    notify(agent(s.who).name,s.text,s.who);
  }
}

/* ---------- ilişki: baş başa akşamlar, dedikodu, çıkar çatışması (açık cinsellik yok; ima ve sahne geçişi) ---------- */
function partnerEvents(o,n){
  const pid=partnerId();if(!pid||!live(pid))return;
  const F=W.fin,lv=W.love[pid],a=agent(pid),me=W.meN||meRole().short,y=lv.yak??10;
  const d=day(n);
  // 1) baş başa akşam daveti
  if(!ringCur&&!ringQ.length&&d-(F.dateDay??-9)>=3&&Math.random()<.4){
    F.dateDay=d;
    const place=['evinde hazırladığı akşam yemeği','boğaz kenarında küçük bir restoran','otel barında geç bir içki','sahilde akşam yürüyüşü'][Math.floor(Math.random()*4)];
    ring({who:pid,kind:'scene',title:'Baş başa bir akşam',ok:'Gidiyorum',no:'Bu akşam olmaz',
      text:`Bu akşam ${place} için seni bekliyorum; telefonlar kapalı, sadece biz.`,loy:[0,-3],
      onAnswer:ok=>{
        if(!ok){loyAdd(pid,-3);pushMsg(pid,{who:'gm',act:true,text:'🌙 Akşam davetini geri çevirdin.',t:Date.now()});dm(pid,'Tamam… Başka zaman.');saveW();return}
        lv.yak=Math.min(100,y+10);loyAdd(pid,4);susAdd(pid,-3);
        W.chron.push(`Başkan ${fnm(a.name)} ile baş başa bir akşam geçirdi.`);
        pushMsg(pid,{who:'gm',act:true,text:`🌙 ${fnm(a.name)} ile baş başa bir akşam geçirdiniz (${clkHM()}).`,t:Date.now()});
        openChat(pid);
        if(S.model)runAgent(a,pid,`Başkan'la ${place} akşamındasın; ilişkinizin düzeyi: ${loveLvl(pid)}. Bu anın sıcaklığını, çekimi ve aranızdaki gerilimi yetişkinlere yakışır bir dille, açık cinsel betimleme olmadan (ima ve sahne geçişiyle) yansıt; en fazla 3 cümle, klişe yok.`,99,true);
        else pushMsg(pid,{who:pid,text:'Geldiğin için teşekkür ederim… Bu akşam her şey çok güzeldi.',t:Date.now()});
        saveW();
      }});
  }
  // 2) kulis / dedikodu / çıkar çatışması
  const gp=Math.min(.35,.06+y/400);
  if(d-(F.gossipDay??-9)>=6&&Math.random()<gp){
    F.gossipDay=d;
    const staff=a.grp==='staff', top=['murat','aylin','sevgi','kerem','orhan','faruk'].includes(pid);
    news(`Kulis: ${me} ile ${a.name} arasındaki yakınlığın holdingde konuşulduğu söyleniyor.`);
    W.hud.itibar.medya='Kulis: yönetimde ilişki dedikodusu';
    dm('ece',`${hit()}, koridorlarda ${fnm(a.name)} ile ilgili konuşulanlar bana da ulaştı; bir gazeteci sormadan önce hazırlıklı olalım.`);
    if(staff&&live('nazli')){
      loyAdd('nazli',-2);
      addDoc('nazli','Çıkar Çatışması Beyan Notu',`Konu: ${me} / ${a.name}\nHolding etik kuralları uyarınca üst-ast ilişkisi ya da yakın kişisel ilişki durumunda çıkar çatışması beyanı verilmesi gerekir. Beyan yapılmaması halinde konu Denetim Komitesi'ne taşınabilir.\n\nNazlı Erdoğan, İç Denetim Müdürü`);
      if(live('selin'))dm('selin',`${hit()}, kuralları hatırlatmak zorundayım: yakın ilişkiler İK'ya bildirilmeli, aksi halde ${fnm(a.name)} üzerinde de baskı oluşabilir.`);
    }
    if(top){loyAdd('kerem',-2);loyAdd('orhan',-2);susAdd(pid,4)}
    loyAdd(pid,-2);
    saveW();renderHudBar();
  }
}

/* ---------- ofis: kapı çalma ---------- */
const KNOCK=[
  {who:'zeynep',text:'Kapıyı çalıyorum; imzanızı bekleyen birkaç evrak var, bir dakikanızı alabilir miyim?',hint:'Ofisin kapısını çalıp içeri girdin; imza bekleyen evrakları ve günün programını kısaca hatırlat. En fazla 2 cümle.'},
  {who:'aylin',text:'Müsaitseniz iki dakikalığına girmek istiyorum; nakit tablosunda konuşmamız gereken bir şey var.',hint:'Ofise girdin; nakit/borç tablosunda dikkatini çeken bir noktayı net söyle. En fazla 2 cümle.'},
  {who:'murat',text:'Kapınızın önünden geçiyordum, içeri bir uğrayayım dedim; iki çift lafımız var.',hint:'Ofise rahat bir tavırla girdin; çıkarını belli etmeden gündemi yoklayan kısa bir laf aç. En fazla 2 cümle.'},
  {who:'kerem',text:'Birkaç dakikanız var mı? Babamla ilgili ve şirketle ilgili konuşmak istediğim bir şey var.',hint:'Ofise girdin; temkinli ama duygusal biçimde aile/şirket kaygını dile getir. En fazla 2 cümle.'},
  {who:'ece',text:'Kapınızı çalabilir miyim? Basında konuşulan bir şey var, önceden haberiniz olsun istedim.',hint:'Ofise girdin; basındaki bir gelişmeyi (kulis, soru, haber) kısa ve net aktar. En fazla 2 cümle.'},
  {who:'hakan',text:'Telefonda anlatmak istemedim; kısa bir ziyaret yapabilir miyim?',hint:'Ofise girdin; Ankara/kamu tarafından gelen bir işareti ima dolu biçimde ilet. En fazla 2 cümle.'},
  {who:'fatma',text:'Çay getirdim yavrum, kapıdayım. İçeri gireyim mi?',hint:'Çayla ofise girdin; sıcak bir ikramla birlikte binadan duyduğun küçük bir şeyi sade bir dille anlat. En fazla 2 cümle.'},
];
function maybeKnock(o,n){
  const F=W.fin;
  for(let d=Math.max(day(o),day(n)-3);d<=day(n);d++)for(const m of [660,930]){
    const t=d*1440+m;if(!(t>o&&t<=n)||ringCur||ringQ.length)continue;
    if(d-(F.knockDay??-9)<1&&m===930||Math.random()>.28)continue;
    const pool=KNOCK.filter(k=>live(k.who)&&!presentOf('g_ofis').includes(k.who)&&(k.who!=='kerem'||W.calm!==true||Math.random()<.4));
    if(!pool.length)continue;
    const k=pool[Math.floor(Math.random()*pool.length)];F.knockDay=d;
    ring({who:k.who,kind:'invite',title:'Kapı çalındı',ok:'İçeri al',no:'Sonra gelsin',text:k.text,loy:[2,-2],
      onAnswer:ok=>{
        if(!ok){loyAdd(k.who,-1);dm(k.who,`${hit()}, anlaşıldı; müsait olunca haber verirsiniz.`);saveW();return}
        enterRoom('g_ofis',[k.who],true);gmNote('g_ofis',`🚪 ${fnm(agent(k.who).name)} kapıyı çalıp içeri girdi.`);openChat('g_ofis');loyAdd(k.who,2);
        if(S.model)runAgent(agent(k.who),'g_ofis',k.hint,99,true);else pushMsg('g_ofis',{who:k.who,text:k.text,t:Date.now()});
        saveW();
      }});
  }
}

/* ---------- muhalefet, davetler ve kullanıcının dahil olduğu gruplar ---------- */
// Muhalif: Başkan'san YK'da azınlıktasın; diğer rollerde üst yönetimin sana sadakati düşüktür.
function isOpp(){
  if(isBoss())return W.hud.yk.muhalif>W.hud.yk.sen;
  const ids=['murat','aylin','sevgi','kerem','faruk'].filter(live);
  return ids.length>0&&ids.reduce((s,i)=>s+loyOf(i),0)/ids.length<40;
}
// W.xgroups: kullanıcının üyesi olduğu dinamik gruplar; GROUPS dizisine eşitlenir (geri alma/yükleme sonrası da)
function syncGroups(){
  const want=W?.xgroups||[];
  for(let i=GROUPS.length-1;i>=0;i--)if(GROUPS[i].x&&!want.some(x=>x.id===GROUPS[i].id))GROUPS.splice(i,1);
  want.forEach(x=>{
    if(!GROUPS.some(g=>g.id===x.id))GROUPS.push({id:x.id,ico:x.ico,name:x.name,members:[...x.members],x:true});
    W.org=W.org||{fired:[],mem:{}};W.org.mem=W.org.mem||{};
    if(!W.org.mem[x.id])W.org.mem[x.id]=[...x.members];
  });
}
{const _ao=applyOrg;applyOrg=function(){try{syncGroups()}catch(e){}_ao()}}
function createUserGroup(name,ico,members,tur){
  const id='g_x'+Date.now().toString(36).slice(-5)+Math.floor(Math.random()*9);
  (W.xgroups||(W.xgroups=[])).push({id,ico,name,members:members.filter(live),tur});
  syncGroups();applyOrg();
  W.present=W.present||{};W.present[id]=[...(W.org.mem[id]||[])];
  return id;
}
function removeUserGroup(id,why){
  const x=(W.xgroups||[]).find(g=>g.id===id);if(!x)return;
  W.xgroups=W.xgroups.filter(g=>g.id!==id);delete W.org.mem[id];delete M[id];
  syncGroups();applyOrg();if(current===id)openChat('g_genel');
  gmNote('g_genel',`🚫 "${x.name}" grubundan çıkarıldın: ${why}`);
}
function ykEvent(log){
  if(!isBoss()){gmNote('g_yk','📅 Haftalık YK toplantısı vakti.');return}
  const ex=W.excl||(W.excl=[]);
  if(isOpp()){
    W.oppStrikes=(W.oppStrikes||0)+1;
    news('Yönetim Kurulu muhalif üyelerin çağrısıyla toplandı; Başkan davet edilmedi.');
    dm('zeynep',`${hit()}, YK bugün toplanmış ama size davet gelmedi; kulislere göre muhalifler kendi aralarında karar almış.`);
    if(W.oppStrikes>=2&&!ex.includes('g_yk')){ex.push('g_yk');if(current==='g_yk')openChat('g_genel');gmNote('g_genel','🚫 Muhalif kanat YK yazışmalarını sana kapattı; artık YK grubunda değilsin.')}
    if(W.oppStrikes>=4&&!ex.includes('g_exco')){ex.push('g_exco');if(current==='g_exco')openChat('g_genel');gmNote('g_genel','🚫 İcra Kurulu da seni dışarıda bıraktı; artık İcra grubunda değilsin.')}
    W.backDue='Muhalifler Başkan olmadan YK topladı';log.push('YK Başkan\'sız toplandı');
    consequences('Muhalif YK üyeleri Başkan davet edilmeden toplanıp kendi kanatlarının lehine bir karar aldı');
  }else{
    if(ex.length||W.oppStrikes){W.excl=[];W.oppStrikes=0;gmNote('g_genel','✅ Çoğunluğu geri kazandın; YK ve İcra Kurulu yazışmaları yeniden açıldı.')}
    gmNote('g_yk','📅 Haftalık YK toplantısı vakti.');
    ring({who:'zeynep',kind:'invite',title:'YK toplantısı daveti',ok:'Katıl',no:'Bu hafta gelmem',
      text:`${hit()}, haftalık YK toplantısı başlıyor; salonda herkes sizi bekliyor.`,
      onAnswer:ok=>{
        if(!ok){loyAdd('murat',-2);loyAdd('kerem',2);gmNote('g_yk','📅 Başkan bu haftaki toplantıya katılmadı.');saveW();return}
        const yk=(group('g_yk')?.members||[]).filter(live);
        enterRoom('g_toplanti',yk,true);gmNote('g_toplanti','🏛 Haftalık YK toplantısı başladı.');openChat('g_toplanti');
        const chair=['murat','faruk'].find(live);
        if(S.model&&chair)runAgent(agent(chair),'g_toplanti','Haftalık YK toplantısını aç: bu haftanın gündemini (nakit, banka, aile, Ankara) iki cümleyle özetle ve Başkan\'a söz ver.',99,true);
        saveW();
      }});
  }
}
const THEMES=[
  {name:'Cuma Akşamı Muhabbet',ico:'🍻',tur:'sosyal',pool:['murat','aylin','sevgi','kerem','orhan']},
  {name:'Finans Ekibi',ico:'📈',tur:'is',pool:['aylin','deniz','can','nazli','tolga']},
  {name:'Saha Dostları',ico:'🏭',tur:'is',pool:['ali','hatice','emre','gul']},
  {name:'Hafta Sonu Futbol',ico:'⚽',tur:'sosyal',pool:['can','berk','emre','mehmet','tolga','ali']},
  {name:'Basın & Kulis',ico:'🗞',tur:'dedikodu',pool:['ece','hakan','tolga','zeynep']},
  {name:'Hanedan Sofrası',ico:'🕯',tur:'aile',pool:['kerem','murat','faruk']},
];
function tryInvite(){
  if(W.calm===undefined)return false;
  const F=W.fin,d=day(clkNow());
  if(d-(F.lastInvite??-99)<4||ringQ.length||ringCur)return false;
  const opp=isOpp();
  if(opp&&Math.random()<.85)return false;   // muhalifken neredeyse hiç davet edilmezsin
  const inGroups=(W.xgroups||[]).map(g=>g.name);
  const likes=id=>live(id)&&loyOf(id)>=(opp?72:60);
  let inv=null;
  // A) ajanların kendi kurduğu gizli grup
  const bgs=(W.bgroups||[]).filter(g=>g.members.filter(live).length>=3&&!inGroups.includes(g.name));
  if(bgs.length&&Math.random()<.45){
    const g=bgs[Math.floor(Math.random()*bgs.length)],who=g.members.filter(m=>likes(m)&&(g.tur!=='koalisyon'||loyOf(m)>=72));
    if(who.length)inv={kind:'bg',g,by:who[Math.floor(Math.random()*who.length)]};
  }
  // B) yeni grup teması
  if(!inv){
    const ths=THEMES.filter(t=>!inGroups.includes(t.name)&&!GROUPS.some(g=>g.name===t.name));
    for(const t of ths.sort(()=>Math.random()-.5)){
      const pool=t.pool.filter(live),by=pool.filter(likes);
      if(pool.length>=3&&by.length){const b=by[Math.floor(Math.random()*by.length)];inv={kind:'theme',t,by:b,mem:pool.filter(m=>m!==b&&loyOf(m)>=35).slice(0,4)};if(inv.mem.length>=2)break;inv=null}
    }
  }
  if(!inv)return false;
  F.lastInvite=d;
  const name=inv.kind==='bg'?inv.g.name:inv.t.name, members=inv.kind==='bg'?inv.g.members.filter(m=>live(m)&&m!==inv.by):inv.mem;
  const names=[inv.by,...members].map(m=>fnm(agent(m).name)).join(', ');
  ring({who:inv.by,kind:'invite',title:'Grup daveti',ok:'Katıl',no:'Şimdilik hayır',
    text:`"${name}" grubuna seni de ekleyelim mi? Üyeler: ${names}.`,
    onAnswer:ok=>{
      if(!ok){loyAdd(inv.by,-2);pushMsg(inv.by,{who:'gm',act:true,text:'Grup davetini reddettin.',t:Date.now()});saveW();return}
      let id;
      if(inv.kind==='bg'){
        id=createUserGroup(inv.g.name,'🕶',[...new Set([...inv.g.members,inv.by])],inv.g.tur);
        M[id]=(M[inv.g.id]||[]).map(m=>({...m}));          // geçmiş yazışmayı da getir
        W.bgroups=(W.bgroups||[]).filter(g=>g.id!==inv.g.id);delete M[inv.g.id];
      }else id=createUserGroup(inv.t.name,inv.t.ico,[inv.by,...inv.mem],inv.t.tur);
      loyAdd(inv.by,3);W.chron.push(`Başkan "${name}" grubuna katıldı.`);saveW();saveM();
      gmNote(id,`👥 Gruba katıldın. Üyeler: ${names}.`);openChat(id);
      if(S.model)runAgent(agent(inv.by),id,'Başkan az önce gruba katıldı; kısa ve samimi bir hoş geldin yaz (en fazla 2 cümle).',99,true);
    }});
  return true;
}
function groupCheck(){   // kullanıcı gruplarında sadakat çok düşerse atılırsın
  (W.xgroups||[]).slice().forEach(x=>{
    const mem=x.members.filter(live);if(!mem.length){removeUserGroup(x.id,'grupta kimse kalmadı.');return}
    if(mem.reduce((s,i)=>s+loyOf(i),0)/mem.length<32)removeUserGroup(x.id,'üyeler seni artık aralarında istemiyor.');
  });
}

/* ---------- zaman kancası ---------- */
let qj=false;
{const _s=setClk;setClk=function(t){
  if(!W)return _s(t);
  if(qj){t+=91*1440;qj=false}
  const o=clkNow();_s(t);
  try{onTime(o,clkNow())}catch(e){console.error('realism',e)}
}}
function onTime(o,n){
  if(!ensure()||n<=o)return;
  const F=W.fin,log=[];
  const mn=Math.floor(n/43200),todo=[];for(let k=F.month+1;k<=mn;k++)todo.push(k);
  F.month=Math.max(F.month,mn);
  todo.slice(-3).forEach(k=>monthClose(k,log));
  let evs=occ(o,n);if(evs.length>8)evs=evs.slice(-8);
  evs.forEach(e=>{try{fireEv(e,log)}catch(x){console.error(x)}});
  const due=(W.pend||[]).filter(p=>p.due<=n);W.pend=(W.pend||[]).filter(p=>p.due>n);due.forEach(p=>firePend(p,log));
  (W.prom||[]).forEach(p=>{if(p.st==='open'&&p.due<=n){p.st='broken';loyAdd(p.who,-8);susAdd(p.who,6);dm(p.who,`${hit()}, "${p.text}" sözünüzün vadesi geçti; hâlâ bekliyoruz.`);log.push('Söz tutulmadı: '+p.text)}});
  maybeScene(o,n);
  try{maybeKnock(o,n)}catch(e){console.error(e)}
  if(day(n)>day(o)){ try{partnerEvents(o,n);pressure();moleTick();youTick();goalsTick(n);if(!W.calm&&!W.ended&&Math.random()<.14)crisisCard();azilCheck(o,n)}catch(e){console.error(e)} if(Math.random()<.4)tryInvite(); if(todo.length)groupCheck() }
  saveW();renderHudBar();refresh();
  if(log.length&&S.model&&S.autoHud)gmTick('Zaman ilerledi ('+clkStr()+'); şu gelişmeler yaşandı: '+log.slice(-4).join(' | ')+'. Panel durumunu tutarlı biçimde güncelle.');
  if($('pnl').classList.contains('open'))renderHud();
}
{const _nt=nextTurn;nextTurn=function(){qj=true;try{_nt()}finally{qj=false}}}
{const _sg=startGame;startGame=function(...a){_sg(...a);try{ensure();setupMoles(a[0]);setupYou(a[0]);if(W&&!W.goals)newQuarter()}catch(e){console.error(e)}}}
{const _hr=hrAction;hrAction=function(kind,id,...r){
  const res=_hr(kind,id,...r);
  try{if(kind==='fire'&&W&&fired(id))S.agents.forEach(a=>{if(live(a.id))loyAdd(a.id,a.grp==='staff'?-2:-1)})}catch(e){}
  return res;
}}

/* ---------- ajan bağlamı: kararlar, sözler, takvim ---------- */
{const _cx=ctxExtra;ctxExtra=function(a){
  let s=_cx(a);
  try{
    if(ensure()&&a.id!=='gm'){
      const dec=(W.dec||[]).slice(0,4).map(d=>`${d.no}: ${d.text}`).join('; ');
      if(dec)s+=`\nSON ALINAN KARARLAR (tutarlı davran, çelişki varsa belirt): ${dec}.`;
      const pr=(W.prom||[]).filter(p=>p.who===a.id&&p.st==='open').map(p=>`"${p.text}" (vade ${lbl(p.due)})`).join('; ');
      if(pr)s+=`\nBAŞKAN'IN SANA VERDİĞİ AÇIK SÖZLER (tutmazsa kırılırsın): ${pr}.`;
      const up=occ(clkNow(),clkNow()+7*1440).slice(0,3).map(e=>`${lbl(e.t)} ${e.ad}`).join('; ');
      if(up)s+=`\nYAKIN TAKVİM: ${up}.`;
      s+=defenseCtx(a)+moleCtx(a)+youCtx(a);
    }
  }catch(e){}
  return s;
}}

/* ---------- savunma: kriz anında sadık ajanlar yanında durur ---------- */
const hasRivals=()=>S.agents.some(x=>x.grp==='rival'&&!fired(x.id));
function defenseCtx(a){
  if(a.id==='gm')return '';
  const krz=(W.hud.krizler||[]).length>0||hasRivals();
  if(a.grp==='rival')return `\nKARŞI TARAFSIN: Soylu Holding'in çalışanı değilsin; Başkan'a karşı baskı kurarsın, kimse seni savunmaz. Teklifinin/çıkarının peşinden git, süre ve baskı ekle, ama gerçekçi ve profesyonel kal.`;
  if(!krz)return '';
  const l=loyOf(a.id),att=(W.hud.krizler||[]).slice(0,2).join(' / ')||'dış baskı';
  if(l>=55)return `\nSAVUNMA GÖREVİN: Başkan şu an saldırı/baskı altında (${att}). Sana sadakatin yüksek: onu yalnız bırakma, ona karşı çıkanlara ve karşı tarafa karşı onun yanında durup savun. Kendi rolünün/uzmanlığının gücüyle SOMUT bir argüman ya da hamle getir (hukuki dayanak, finansal veri, hissedar/medya/Ankara tarafı, savunma seçenekleri: zehir hapı, beyaz şövalye, Pac-Man, vekâlet toplama vb.). Bu anda [PAS] yazma; boş onay yerine yardım et. Önceki cevaplarında söylediklerini tekrar etme.`;
  if(l>=35)return `\nTARAF TUTMA: Başkan baskı altında (${att}). Sadakatin orta: duruma ve Başkan'ın gücüne bakarak temkinli ve kendi çıkarına uygun konuş; açıkça karşı çıkma ama gerekirse küçük bir şart ya da destek koş.`;
  return `\nFIRSATÇILIK: Başkan baskı altında (${att}). Sadakatin düşük: mesafeli ve çıkarcı ol, riskleri vurgula, gerekirse karşı tarafla ya da güçlü olanla işbirliğine meyil göster.`;
}
{const _sp=sysPrompt;sysPrompt=function(a,chat){
  let s=_sp(a,chat);
  try{const mm=W?.mem?.[chat];if(mm)s+=`\n\nBU YAZIŞMANIN ESKİ KISMININ ÖZETİ (hafızan; unutma, tutarlı davran):\n${mm}`}catch(e){}
  return s;
}}
/* ---------- hafıza: pencereden çıkan eski mesajlar özetlenip saklanır ---------- */
const memBusy={};
async function memSummarize(chat){
  if(!S.model||!W||memBusy[chat])return;
  const l=msgs(chat),T=(W.memT||(W.memT={}))[chat]||0,to=l.length-40;
  const chunk=l.slice(0,Math.max(0,to)).filter(m=>!m.act&&m.t>T);
  if(chunk.length<14)return;
  memBusy[chat]=1;const ep=epoch,last=chunk[chunk.length-1].t;
  try{
    const old=(W.mem||(W.mem={}))[chat]||'';
    const tr=chunk.map(m=>`${m.who==='user'?'BAŞKAN':agent(m.who)?.name||'?'}: ${String(m.text).slice(0,260)}`).join('\n');
    const prompt=`Aşağıdaki rol yapma sohbetinin ESKİ özeti ve yeni geçen konuşmalar var. Bunları tek bir güncel özet hâlinde birleştir: alınan kararlar, verilen sözler, taraflar (kim kimi destekliyor/karşı), açık konular, duygusal durum ve önemli rakamlar korunsun. En fazla 900 karakter, Türkçe, maddesiz düz metin.\n\nESKİ ÖZET: ${old||'(yok)'}\n\nYENİ KONUŞMALAR:\n${tr}`;
    const r=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),body:JSON.stringify({model:S.model,messages:[{role:'user',content:prompt}],stream:false,max_tokens:450})});
    if(!r.ok||ep!==epoch)return;
    const tx=((await r.json()).choices?.[0]?.message?.content||'').trim();
    if(tx){W.mem[chat]=tx.slice(0,1100);W.memT[chat]=last;saveW()}
  }catch(e){}finally{memBusy[chat]=0}
}
{const _pm=pushMsg;pushMsg=function(chat,m){_pm(chat,m);try{if(m&&!m.act&&m.who!=='gm')memSummarize(chat)}catch(e){}}}
/* ---------- baskı dalgası: karşı taraf zaman ilerledikçe baskı yapar, sadıklar savunur ---------- */
const PRESS=[
  'Teklifimizin süresi doluyor. Yönetim kurulunuz bu hafta kararını açıklamazsa doğrudan hissedarlara gidiyoruz.',
  'Küçük hissedarlarla temas kurduk; çoğu bizim fiyatımıza sıcak. Vekâlet toplantısına hazırlanın.',
  'Pay oranımız yükseldi. SPK bildirimimizi yaptık; konuşmak için hâlâ kapı açığız ama sabrımız sınırlı.',
  'Basına bir bilgi notu geçeceğiz. İsterseniz önce telefonda, kendi cümlelerinizle konuşalım.',
];
function pressure(){
  if(!W||!W.fin||W.you)return;
  const rv=S.agents.filter(x=>x.grp==='rival'&&live(x.id));if(!rv.length||W.calm)return;
  const F=W.fin,d=day(clkNow());if(d-(F.pressDay??-9)<3)return;F.pressDay=d;
  const r=rv[Math.floor(Math.random()*rv.length)],txt=PRESS[Math.floor(Math.random()*PRESS.length)];
  if(S.model)runAgent(r,r.id,`Başkan'a özelden yazıyorsun: Borealis Capital adına bir sonraki baskı hamlesini yap (süre, hissedar baskısı, basın ya da SPK). Soğuk ve profesyonel, en fazla 2 cümle.`,99,true);
  else dm(r.id,txt);
  W.chron.push(`${r.name} (Borealis) Başkan'a yeni bir baskı mesajı gönderdi.`);W.backDue='Borealis baskı yaptı';
  // sadık biri 10 sn sonra savunur
  const EXP=['sevgi','aylin','tolga','ece','hakan','murat'],sc=x=>loyOf(x.id)+(EXP.includes(x.id)?40:0);
  const def=S.agents.filter(x=>x.grp!=='rival'&&live(x.id)&&loyOf(x.id)>=55).sort((a,b)=>sc(b)-sc(a))[0];
  if(def)setTimeout(()=>{if(!W||!live(def.id))return;
    if(S.model)runAgent(def,def.id,`Borealis'in yeni baskı hamlesini duydun (${W.hud.krizler.join('; ')}). Başkan'a özelden, kendi uzmanlığınla somut bir savunma/öneri yaz; yanında olduğunu hissettir. En fazla 2 cümle.`,99,true);
    else dm(def.id,`${hit()}, Borealis'in baskısına karşı yanınızdayım; hissedarlara ve basına karşı net bir savunma hattı kuralım.`);
    saveW();
  },8000+Math.random()*6000);
  saveW();
}

/* ---------- köstebek: Borealis ile gizlice çalışan içeriden kişiler ---------- */
const MOLE_POOL=['cem','kerem','hakan','orhan','murat','gul','emre','tolga','aylin','hatice','ali','deniz'];
function setupMoles(sc){
  if(!sc||!sc.mole||!W)return;
  const ids=MOLE_POOL.filter(live).sort(()=>Math.random()-.5).slice(0,sc.mole);
  W.mole={ids,clues:{},gone:[],wrong:0,tick:0};
  saveW();
}
const moleOn=id=>!!W?.mole?.ids?.includes(id);
function moleCtx(a){
  if(!W?.mole)return '';
  if(moleOn(a.id))return `\nGİZLİ GÖREV (asla düz metinle itiraf etme): Borealis Capital ile gizlice çalışıyorsun ve bunun karşılığında bir çıkarın var. Yüzeyde sadık ve yardımsever görün; ama kararları sessizce baltala, gerçeklerin eksik ya da yanlış yönlendirici kısmını söyle, hassas bilgiyi sızdırdığını belli etme. Suçlanırsan karakterine göre inkâr et, öfkelen ya da saf rolü yap; yakalanma korkunu davranışlarında hafifçe sızdır (gergin bir ayrıntı, fazla savunmacı bir cümle). Başkan'ı savunuyormuş gibi ama zayıf ve işe yaramaz argümanlar getir.`;
  if(a.grp==='rival')return `\nİÇERİDEKİ MÜTTEFİKLERİN (gizli): ${W.mole.ids.filter(live).map(i=>agent(i).name).join(', ')||'yok'}. Onlar holdingin içinden sana bilgi sızdırıyor; bunu ASLA açığa vurma ve isim verme.`;
  return '';
}
const LEAKS=[
  d=>`Kulis: Holding yönetim kurulunda ${d?'"'+d+'" kararının':'kapalı toplantıda alınan kararın'} içeriği basına aynen sızdı; kaynak "içeriden biri".`,
  ()=>'Kulis: Bankaların bir kısmı holdingin iç nakit tablosunu toplantıdan önce öğrenmiş; bilgi kaynağı yönetimden.',
  ()=>'Kulis: Borealis, YK içindeki görüş ayrılıklarını biliyor; karşı hamlelerini bu bilgiyle ayarladığı konuşuluyor.',
  ()=>'Kulis: Holdingin savunma planının ayrıntıları karşı tarafın eline geçti; plan sahada öngörülebilir hâle geldi.',
];
const BACK=['Cuma günkü toplantının notlarını gönderiyorum; YK\'daki ayrılık tam anlattığım gibi.','Nakit tablosu ekte; bankaya gitmeden önce bunu bilmeniz işinize yarar.','Savunma planı bu: zehir hapı ve beyaz şövalye; ikisini de hazırlıyorlar.','Beni arama, mesajla yaz; birileri bakıyor gibi.'];
function moleTick(){
  const M0=W.mole;if(!M0||!M0.ids.length||!ensure())return;
  if(Math.random()>.45)return;
  const id=M0.ids[Math.floor(Math.random()*M0.ids.length)];if(!live(id))return;
  const F=W.fin,kind=Math.floor(Math.random()*4),dec=(W.dec||[])[0]?.text;
  M0.clues[id]=(M0.clues[id]||0)+1;M0.tick++;
  const sel=S.agents.find(x=>x.id==='selim'&&live('selim'))?'selim':null;
  if(sel)pushMsg(dmId(id,sel),{who:id,text:BACK[Math.floor(Math.random()*BACK.length)],t:Date.now()});   // perde arkası
  if(kind===0){news(LEAKS[0](dec&&dec.slice(0,60)));const p=-rnd(.01,.03);F.hisse*=1+p;F.pv*=1+p;sync(p);W.hud.itibar.medya='Sızıntı haberleri'}
  else if(kind===1){news(LEAKS[1]());F.faiz=clamp(F.faiz+.3,4,18);sync();dm('aylin',`${hit()}, bankalar yeni borçlanma fiyatını nakit tablomuza bakarak yükseltti; bu bilgi onlara dışarıdan ulaşmış.`)}
  else if(kind===2){news(LEAKS[2]());W.pend=[...(W.pend||[]),{due:clkNow()+Math.floor(rnd(1,4))*1440,olay:'Borealis, YK içindeki bölünmeyi öne çıkaran bir açıklama yaptı; küçük hissedarlar teklife daha sıcak bakıyor.',nakit:0,hisse_pct:-1.5,sadakat:{}}]}
  else{news(LEAKS[3]());W.pend=[...(W.pend||[]),{due:clkNow()+Math.floor(rnd(1,3))*1440,olay:'Savunma planı sızdığı için karşı taraf hamlesini önceden yaptı; ek maliyet çıktı.',nakit:-Math.round(rnd(30,90)),hisse_pct:-1,sadakat:{}}]}
  W.chron.push('Gizli sızıntı: içeriden biri Borealis\'e bilgi veriyor.');
  // ipucu: iç denetim / BT iz bulur
  if(M0.tick>=2&&Math.random()<.6){
    const strong=M0.clues[id]>=4,who=strong?'berk':'nazli';
    if(live(who)){
      const cand=MOLE_POOL.filter(x=>live(x)&&x!==id&&!M0.ids.includes(x)),other=cand[Math.floor(Math.random()*cand.length)]||'cem';
      const txt=strong?`${hit()}, e-posta ve erişim kayıtlarını eşleştirdim; sızıntıların zamanı ${fnm(agent(id).name)} adlı kişinin hareketleriyle birebir örtüşüyor. Kesin demiyorum ama kanıtlar o yönde.`
        :`${hit()}, sızıntıların zamanlamasında iki isim öne çıkıyor: ${[id,other].filter(live).sort(()=>Math.random()-.5).map(x=>fnm(agent(x).name)).join(' ve ')}. Henüz kanıt yok, izlemeye devam ediyorum.`;
      dm(who,txt);addDoc(who,strong?'BT Erişim Kaydı Raporu':'İç Denetim Ön Bulgu Notu',`${txt}\n\nBu not gizlidir. Kişiyi suçlamadan önce kanıtı doğrulamanız önerilir. Komut: /ifşa <isim>`);
    }
  }
  saveW();
}
function accuse(arg){
  const M0=W.mole;
  if(!M0){sysNote('Şu an aktif bir köstebek soruşturması yok.');return}
  const who=addressed(arg,S.agents.filter(a=>live(a.id)&&a.grp!=='rival'))[0];
  if(!who){sysNote('Kullanım: /ifşa <isim> (örn. /ifşa Cem)');return}
  const F=W.fin;
  if(M0.ids.includes(who.id)){
    M0.ids=M0.ids.filter(x=>x!==who.id);M0.gone.push(who.id);
    W.org=W.org||{fired:[],mem:{}};if(!W.org.fired.includes(who.id))W.org.fired.push(who.id);applyOrg();
    news(`${who.name} Borealis ile gizli iş birliği yaptığı gerekçesiyle görevden uzaklaştırıldı.`);
    const p=rnd(.02,.05);F.hisse*=1+p;F.pv*=1+p;sync(p);
    W.chron.push(`Köstebek ifşa edildi: ${who.name}.`);
    gmNote(current,`🐀 ${fnm(who.name)} köstebek çıktı! Görevden uzaklaştırıldı${M0.ids.length?`; ama içeride hâlâ ${M0.ids.length} kişi var.`:'; içeride başka köstebek kalmadı.'}`);
    if(!M0.ids.length){gmNote('g_genel','✅ Sızıntı durdu: Borealis içerideki kaynaklarını kaybetti.');W.hud.krizler=(W.hud.krizler||[]).filter(k=>!/sızıntı|içeriden/i.test(k))}
    ['nazli','berk','ece'].forEach(i=>loyAdd(i,3));
  }else{
    M0.wrong++;
    const clue=M0.clues[who.id]||0;
    loyAdd(who.id,-18);susAdd(who.id,8);S.agents.forEach(a=>{if(live(a.id)&&a.id!==who.id)loyAdd(a.id,-2)});
    news(`Başkan ${who.name}'i köstebeklikle suçladı; iddia temelsiz çıktı, yönetimde güven sarsıldı.`);
    W.chron.push(`Başkan ${who.name}'i haksız yere suçladı.`);
    gmNote(current,`⚠️ ${fnm(who.name)} köstebek değilmiş. Yanlış suçlama yönetimde güveni sarstı.`);
    if(M0.wrong>=2&&M0.ids.length){const mm=agent(M0.ids[0]);if(mm)W.pend=[...(W.pend||[]),{due:clkNow()+1440,olay:'Köstebek fırsatı kullandı: suçlamalar ve iç huzursuzluk basına sızdı, hisse zayıfladı.',nakit:0,hisse_pct:-2.5,sadakat:{}}]}
    dm(who.id,`${hit()}, bu suçlama beni derinden yaraladı; kanıtınız varsa görmek isterim.`);
  }
  saveW();renderHudBar();refresh();
}
/* ---------- köstebek sensin: Borealis'e gizlice çalışan kullanıcı ---------- */
const YTASK=['Cuma günkü YK toplantısının notlarını ve kimin ne dediğini bize ilet.','Nakit planını ve banka görüşmelerinin ayrıntılarını paylaş.','Savunma planının (zehir hapı, beyaz şövalye) hazırlık durumunu anlat.','Küçük hissedarların listesini ve hangilerinin satmaya yatkın olduğunu ver.'];
const YREPLY=['Not aldım. Bu bilgi bize çok işe yarayacak; hesabına ek bir ödeme yapıldı.','Güzel. Hamlemizi buna göre ayarlayacağız. Kimseyle konuşma, hat temiz kalsın.','Teşekkürler. Bir adım daha yaklaştık; seni unutmayacağız.','Tam zamanında geldi. Ödemen yolda, dikkatli ol.'];
function youLevel(){const s=W.you.sus;return s<20?'Düşük':s<45?'Orta':s<70?'Yüksek':'Kritik'}
function setupYou(sc){
  if(!sc||!sc.youMole||!W)return;
  W.you={sus:5,prog:10,paid:0,leaks:0,last:day(clkNow()),caught:false,won:false,taskDay:day(clkNow())};
  W.chron.push('Gizli: Başkan\'ın ekibinden biri Borealis ile temasta.');
  setTimeout(()=>{if(!W||!W.you)return;
    pushMsg('selim',{who:'selim',text:'Hoş geldin. Bu hat sadece bizim; başka kimseye gösterme. İlk bilgiyi göndermen yeter: /sızdır <ne öğrendin> yazman yeterli.',t:Date.now()});
    gmNote(current,'🕶️ Sen Borealis\'in içerideki adamısın. Komutlar: /sızdır <bilgi> · /rapor. Şüphe ve ilerleme panelde (💰 → Gizli hat). İç denetim ve BT iz sürüyor.');
    saveW();
  },400);
  saveW();
}
function youLeak(text,mult=1){
  const Y=W.you,F=W.fin;if(!Y||Y.caught||Y.won)return;
  const d=day(clkNow());Y.last=d;Y.leaks++;
  const prog=Math.round(rnd(6,10)*mult),pay=Math.round(rnd(6,14)*mult*10)/10,sus=Math.round(rnd(7,13)*mult);
  Y.prog=Math.min(100,Y.prog+prog);Y.sus=Math.min(100,Y.sus+sus);Y.paid=Math.round((Y.paid+pay)*10)/10;
  const p=-rnd(.008,.025)*mult;F.hisse*=1+p;F.pv*=1+p;sync(p);
  W.pend=[...(W.pend||[]),{due:clkNow()+Math.floor(rnd(1,4))*1440,olay:'Borealis, içeriden gelen bilgiyle hamlesini ayarladı; holdingin savunması zorlaştı.',nakit:-Math.round(rnd(10,40)*mult),hisse_pct:-rnd(.5,1.5),sadakat:{}}];
  if(Math.random()<.5)news(`Kulis: Holdingin iç planı ${text?'("'+String(text).slice(0,50)+'") ':''}karşı tarafın eline geçmiş görünüyor; sızıntının kaynağı araştırılıyor.`);
  W.chron.push('Gizli sızıntı yapıldı.');
  const rep=YREPLY[Math.floor(Math.random()*YREPLY.length)];
  if(S.model&&live('selim'))runAgent(agent('selim'),'selim',`Başkan'ın ekibindeki gizli köstebek az önce sana şu bilgiyi verdi: "${text||'(ayrıntı vermedi)'}". Ona kısa, soğuk ve profesyonelce teşekkür et, ödemeyi/ilerlemeyi ima et ve dikkatli olmasını söyle. En fazla 2 cümle.`,99,true);
  else pushMsg('selim',{who:'selim',text:rep,t:Date.now()});
  gmNote(current,`🕶️ Bilgi gitti (+${pay} M₺ kişisel kazanç). Borealis ilerlemesi %${Y.prog}, şüphe: ${youLevel()}.`);
  if(Y.prog>=100)youWin();
  saveW();renderHudBar();refresh();
}
function youWin(){
  const Y=W.you;if(Y.won||Y.caught)return;Y.won=true;
  news('Borealis Capital, holdingde kontrolü ele geçirdi; yönetim kurulu yeniden yapılandırıldı.');
  ring({who:'selim',kind:'invite',title:'Devralma tamamlandı',ok:'Kabul et',no:'Kabul et',text:`Kontrol bizde. Sözümüzü tutuyoruz: ${fx(Y.paid)} M₺ kişisel ödemeni aldın ve Borealis'te sana yönetici ortaklık pozisyonu hazır. İyi iş çıkardın.`,onAnswer:()=>{gmNote(current,'🏁 OYUN SONU — Köstebek başarıyla görevi tamamladı. Yeni oyun için ⚙️ menüsünden senaryo seç.');saveW()}});
}
function youCaught(why){
  const Y=W.you;if(!Y||Y.caught||Y.won)return;Y.caught=true;
  news('İç soruşturma tamamlandı: Borealis\'e bilgi sızdıran yönetici ortaya çıktı ve görevinden alındı.');
  W.chron.push('Köstebek (kullanıcı) yakalandı.');
  ring({who:live('nazli')?'nazli':'zeynep',kind:'invite',title:'Soruşturma sonucu',ok:'Kabul et',no:'İtiraf et',text:`${why} Bilgisayar, e-posta ve toplantı kayıtları seni gösteriyor. Görevinle ilişiğin kesildi.`,onAnswer:()=>{gmNote(current,'🏁 OYUN SONU — Yakalandın, kariyerin bitti. Yeni oyun için ⚙️ menüsünden senaryo seç.');saveW()}});
  saveW();
}
function youTick(){
  const Y=W.you;if(!Y||Y.caught||Y.won||!ensure())return;
  const d=day(clkNow());
  if(d-Y.last>=3)Y.sus=Math.max(0,Y.sus-2);
  if(Y.sus>=35&&!Y.s1&&live('nazli')){Y.s1=1;dm('nazli',`${hit()}, sızıntıların zamanlamasında yönetimden birine ait izler görüyorum; henüz isim yok ama daraltıyorum.`)}
  if(Y.sus>=60&&!Y.s2&&live('berk')){Y.s2=1;dm('berk',`${hit()}, erişim kayıtlarında şüpheli bir örüntü var; yönetim katından biri dışarıyla gizli iletişim kuruyor olabilir.`);addDoc('berk','BT Erişim Kaydı Raporu','Gizli: Yönetim katından kaynaklanan, mesai dışı ve şifreli dış iletişim örüntüsü tespit edilmiştir. Kişi tespiti için ek log analizi sürmektedir.\n\nBerk Polat, BT & Siber Güvenlik')}
  if(Y.sus>=78&&!Y.s3&&!ringCur&&!ringQ.length){Y.s3=1;
    ring({who:live('faruk')?'faruk':'murat',kind:'invite',title:'Savunma toplantısı',ok:'Katıl',no:'Gitme',text:'Soruşturma ekibi seninle bir görüşme istiyor. Sızıntılarla ilgili bazı kayıtlar önünde; açıklaman gerekiyor.',
      onAnswer:ok=>{if(ok&&Math.random()<.5){Y.sus=Math.max(0,Y.sus-22);gmNote(current,'😮‍💨 Görüşmeyi atlattın; şüphe biraz dağıldı.')}else{Y.sus=Math.min(100,Y.sus+(ok?12:20));gmNote(current,ok?'⚠️ Yanıtların tutarsız bulundu; şüphe arttı.':'⚠️ Gitmemen şüpheyi artırdı.')}saveW()}})}
  if(Y.sus>=100)youCaught('Soruşturma kesinleşti.');
  // Borealis görevi
  if(d-Y.taskDay>=4&&!ringCur&&!ringQ.length&&live('selim')){Y.taskDay=d;
    const t=YTASK[Math.floor(Math.random()*YTASK.length)];
    ring({who:'selim',kind:'invite',title:'Borealis görevi',ok:'Yap',no:'Reddet',text:t,onAnswer:ok=>{
      if(ok)youLeak(t.slice(0,60),1.4);
      else{Y.sus=Math.min(100,Y.sus+3);dm('selim','Kayıtlar elimizde, unutma. Bir sonraki sefer reddetme.');W.chron.push('Borealis görevi reddedildi.');saveW()}
    }});
  }
  saveW();
}
function youCmd(cmd,arg){
  const Y=W.you;
  if(!Y){sysNote('Bu komut sadece "Köstebek Sensin" senaryosunda çalışır.');return}
  if(Y.caught||Y.won){sysNote('Oyun bitti. Yeni oyun için ⚙️ menüsünden senaryo seç.');return}
  if(cmd==='rapor'){sysNote(`🕶️ Borealis ilerlemesi %${Y.prog} · şüphe: ${youLevel()} (${Y.sus}) · kişisel kazanç ${fx(Y.paid,1)} M₺ · sızıntı ${Y.leaks}`);return}
  youLeak(arg,1);
}
const youBlock=()=>{const Y=W.you;return Y?`<h3>🕶️ Gizli hat (Borealis)</h3><div class="kv"><span>Devralma ilerlemesi</span><span>%${Y.prog}</span></div><div class="kv"><span>Şüphe düzeyi</span><span>${youLevel()} (${Y.sus})</span></div><div class="kv"><span>Kişisel kazanç</span><span>${fx(Y.paid,1)} M₺</span></div><div class="kv"><span>Sızıntı sayısı</span><span>${Y.leaks}</span></div><div class="mut">${Y.caught?'Yakalandın.':Y.won?'Devralma tamamlandı.':'Komut: /sızdır <bilgi> · /rapor. Sızdırdıkça şüphe artar; birkaç gün sakin durursan düşer.'}</div>`:''};
function youCtx(a){
  const Y=W?.you;if(!Y)return '';
  if(a.id==='nazli'&&Y.sus>=35)return `\nSORUŞTURMA: Sızıntıların kaynağını arıyorsun; kullanıcıdan hafif şüphelenmeye başladın (şüphe düzeyi: ${youLevel()}). Kesin suçlama yapma ama soru sor, iz sürdüğünü hissettir.`;
  if(a.id==='berk'&&Y.sus>=45)return `\nSORUŞTURMA: Erişim kayıtlarında şüpheli bir iz buldun ve bunun kullanıcıya yaklaştığını fark ediyorsun; temkinli ama kararlı konuş.`;
  if(a.grp==='rival'&&a.id==='selim')return `\nKÖSTEBEĞİN: Kullanıcı Borealis adına içeriden çalışıyor. Onunla soğuk ve ticari konuş; sızdırdıkça ödeme ve konum sözü ver, yakalanırsa ondan uzaklaşacağını ima et. Ajan olmadığını başkalarına asla söyleme.`;
  if(Y.sus>=65&&a.grp!=='rival')return `\nSOĞUKLUK: Yönetimde senin hakkında kuşku var; kullanıcıya karşı mesafelisin ve sorgularsın.`;
  return '';
}
/* ---------- okundu tikleri: ✓ gönderildi, ✓✓ iletildi, mavi ✓✓ okundu ---------- */
function setRd(chat,m,l){
  if(!m||(m.rd??2)>=l)return;m.rd=l;
  if(chat===current){const el=elOf.get(m),t=el?.parentNode?.querySelector('.tk');if(t){t.className='tk r'+l;t.textContent=l?'✓✓':'✓'}}
}
function markRead(chat){let ch=false;for(const m of msgs(chat))if(m.who==='user'&&(m.rd??2)<2){setRd(chat,m,2);ch=true}if(ch)saveM()}
function rdTargets(chat){return isGroup(chat)?presentOf(chat):[chat]}
{const _pm2=pushMsg;pushMsg=function(chat,m){
  const mine=m&&m.who==='user'&&!m.act;
  if(mine&&W)m.rd=0;
  _pm2(chat,m);
  try{
    if(!W||!m)return;
    if(m.who!=='user'&&m.who!=='gm')markRead(chat);          // cevap geldiyse hepsi okunmuştur
    if(mine){
      const tg=rdTargets(chat).filter(x=>agent(x)&&!fired(x)&&x!=='gm');
      if(!tg.length)return;                                    // kimse yok / işten çıkarılmış: tek tik kalır
      const off=!isOffice(clkNow()),lowest=Math.min(...tg.map(x=>loyOf(x)));
      setTimeout(()=>{setRd(chat,m,1);saveM()},350+Math.random()*600);
      const wait=(off?15000+Math.random()*25000:lowest<35?9000+Math.random()*14000:1400+Math.random()*3800);
      setTimeout(()=>{setRd(chat,m,2);saveM()},wait);
    }
  }catch(e){}
}}
{const _st=setTyping;setTyping=function(chat,id,on){if(on)try{markRead(chat)}catch(e){}_st(chat,id,on)}}
/* ---------- hedefler ve sezon sonu ---------- */
const avgLoy=ids=>{const l=ids.filter(live);return l.length?l.reduce((s,i)=>s+loyOf(i),0)/l.length:50};
const TOPX=['murat','aylin','sevgi','kerem','orhan','faruk'];
function newQuarter(){
  const F=W.fin,d=day(clkNow()),g=W.goals||(W.goals={q:0,season:1,hist:[],score:0});
  g.q++;g.startDay=d;g.endDay=d+90;
  const all=[
    {id:'nakit',t:Math.round(F.nakit*1.12),txt:`Nakdi ${fx(F.nakit*1.12)} M₺ üzerine çıkar`},
    {id:'hisse',t:Math.round(F.hisse*1.08*100)/100,txt:`Hisseyi ${fx(F.hisse*1.08,2)} TL üzerine taşı`},
    {id:'borc',t:Math.max(1.2,Math.round((borcX()-.3)*10)/10),txt:`Net borç/FAVÖK oranını ${fx(Math.max(1.2,borcX()-.3),1)}x altına indir`},
    {id:'sadakat',t:Math.min(75,Math.round(avgLoy(TOPX))+6),txt:`Üst yönetimin sana ortalama sadakatini ${Math.min(75,Math.round(avgLoy(TOPX))+6)} üzerine çıkar`},
    {id:'kriz',t:1,txt:'Açık kriz sayısını en fazla 1\'de tut'},
    {id:'temettu',t:d,txt:'Hissedarlara temettü dağıt (panelden)'},
  ];
  const pool=all.filter(x=>!(x.id==='kriz'&&(W.hud.krizler||[]).length<=1&&false));
  g.items=pool.sort(()=>Math.random()-.5).slice(0,3);
  gmNote('g_genel',`🎯 ${g.season}. sezon, ${((g.q-1)%4)+1}. çeyrek hedefleri: ${g.items.map(i=>i.txt).join(' · ')}`);
  saveW();
}
function goalOk(i){
  const F=W.fin;
  switch(i.id){
    case'nakit':return F.nakit>=i.t;
    case'hisse':return F.hisse>=i.t;
    case'borc':return borcX()<=i.t;
    case'sadakat':return avgLoy(TOPX)>=i.t;
    case'kriz':return (W.hud.krizler||[]).length<=i.t;
    case'temettu':return F.lastTemettu!==null&&F.lastTemettu>=W.goals.startDay;
  }
  return false;
}
function closeQuarter(){
  const g=W.goals,res=g.items.map(i=>({txt:i.txt,ok:goalOk(i)})),done=res.filter(r=>r.ok).length,tot=res.length;
  g.score+=done*10;g.hist.push({q:g.q,done,tot});
  const nb=`Çeyrek karnesi: ${done}/${tot} hedef tutturuldu.`;news(nb);W.chron.push(nb);
  addDoc('tolga',`${g.season}. sezon ${((g.q-1)%4)+1}. çeyrek hedef karnesi`,`ÇEYREK HEDEF KARNESİ\n\n${res.map(r=>`${r.ok?'✔':'✖'} ${r.txt}`).join('\n')}\n\nSonuç: ${done}/${tot} hedef · Toplam puan: ${g.score}\n\nYatırımcı İlişkileri · Tolga Başar`);
  const d=done>=2?2:-2;['murat','kerem','orhan','sevgi'].forEach(i=>loyAdd(i,d));
  gmNote('g_genel',`📊 ${nb} Puan: ${g.score}.`);
  if(g.q%4===0){   // sezon sonu
    const tot2=g.hist.slice(-4).reduce((s,h)=>s+h.tot,0),done2=g.hist.slice(-4).reduce((s,h)=>s+h.done,0),r=done2/Math.max(1,tot2);
    const grade=r>=.75?'🏆 Yılın Yöneticisi':r>=.5?'👍 Başarılı sezon':'⚠️ Zorlu sezon';
    const txt=`${g.season}. sezon bitti. ${done2}/${tot2} hedef tutturuldu. Karne: ${grade}. Nakit ${fx(W.fin.nakit)} M₺, hisse ${fx(W.fin.hisse,2)} TL, net borç/FAVÖK ${fx(borcX(),1)}x. Toplam puan: ${g.score}.`;
    news('Sezon sonu: '+txt);
    ring({who:'zeynep',kind:'invite',title:'Sezon sonu karnesi',ok:'Yeni sezona başla',no:'Yeni sezona başla',text:txt,onAnswer:()=>{g.season++;newQuarter()}});
  }else newQuarter();
  saveW();
}
function goalsTick(n){
  if(!W.goals){newQuarter();return}
  if(day(n)>=W.goals.endDay)closeQuarter();
}
const goalsBlock=()=>{const g=W.goals;if(!g)return '';return `<h3>🎯 Hedefler · ${g.season}. sezon ${((g.q-1)%4)+1}. çeyrek</h3>`+g.items.map(i=>`<div class="kv"><span>${goalOk(i)?'✔':'⬜'} ${esc(i.txt)}</span><span></span></div>`).join('')+`<div class="kv"><span>Çeyrek sonu</span><span>${Math.max(0,g.endDay-day(clkNow()))} gün sonra</span></div><div class="kv"><span>Puan</span><span>${g.score}</span></div>`};
/* ---------- kriz kartları: 2-3 seçenekli kararlar ---------- */
const CRISES=[
 {id:'basin',who:'ece',title:'Basın skandalı',text:'Bir gazete, yönetimin harcamalarıyla ilgili yarın manşet yapmaya hazırlanıyor. Yanıt için birkaç saatimiz var.',opts:[
  {t:'Resmî yalanlama yayımla',fx:{hisse:-.5,loy:{ece:2},news:'Holding gazetedeki iddiaları yalanladı; tartışma sürüyor.'}},
  {t:'Gazete sahibiyle özel görüş (bedel öde)',fx:{nakit:-45,loy:{hakan:2},news:'Haber manşetten kaldırıldı; kulis: arka planda bir anlaşma yapıldı.',itibar:{medya:'Kulis: gazeteyle gizli anlaşma'}}},
  {t:'Sessiz kal',fx:{hisse:-2.5,loy:{ece:-3},news:'Holding iddialara yanıt vermedi; haber hızla yayıldı.',itibar:{medya:'Olumsuz haber akışı'}}}]},
 {id:'vergi',who:'hakan',title:'Vergi denetimi',text:'VDK, son üç yılın iştirak kayıtlarını incelemek için yazı gönderdi. Hakan "bu işin yolu var" diyor.',opts:[
  {t:'Tam şeffaflık: belgeleri teslim et',fx:{nakit:-20,loy:{nazli:3,sevgi:2},news:'Holding VDK incelemesine tüm belgeleri teslim etti.',itibar:{ankara:'Mesafeli ama saygılı'}}},
  {t:'Hakan\'ın "yolunu" dene',fx:{nakit:-35,loy:{hakan:3,nazli:-4,sevgi:-3},sus:{hakan:4},news:'Kulis: VDK incelemesi arka kapıdan "yumuşatılmaya" çalışılıyor.',itibar:{spk:'İnceleme riski arttı'}}},
  {t:'Avukatla savun, gecikme talep et',fx:{nakit:-10,hisse:-.8,loy:{sevgi:2},news:'Holding VDK\'dan ek süre istedi; inceleme uzayacak.'}}]},
 {id:'grev',who:'hatice',title:'Grev ihtarı',text:'Demir-Çelik\'te sendika, ücret zammı için 72 saat süre verdi. Fabrika müdürü hattı durdurmaktan korkuyor.',opts:[
  {t:'Zam teklifini kabul et',fx:{nakit:-60,loy:{hatice:5,ali:3,aylin:-2},news:'Demir-Çelik\'te sendikayla zam üzerinde anlaşıldı; grev ertelendi.'}},
  {t:'Sert tavır: işten çıkarma uyarısı',fx:{hisse:-1.8,loy:{hatice:-6,ali:-2,selin:-3},krizAdd:'Demir-Çelik\'te grev başladı',news:'Demir-Çelik\'te grev başladı; üretim durdu.'}},
  {t:'Arabulucu çağır, süre kazan',fx:{nakit:-15,loy:{hatice:1,selin:2},news:'Arabulucu devrede; grev bir hafta ertelendi.'}}]},
 {id:'siber',who:'berk',title:'Siber saldırı',text:'Berk: "Fidye yazılımı müşteri veritabanını şifreledi. 48 saatlik süre var."',opts:[
  {t:'Fidyeyi öde',fx:{nakit:-80,loy:{berk:-1,nazli:-3},sus:{berk:2},news:'Kulis: Holding siber saldırıya karşı fidye ödediği konuşuluyor.'}},
  {t:'Yedeklerden kurtar, ödeme yapma',fx:{nakit:-30,hisse:-1.2,loy:{berk:4},news:'Holding fidyeyi reddetti; sistemler yedekten geri yükleniyor.'}},
  {t:'Kolluk ve SPK\'ya bildir',fx:{nakit:-20,hisse:-.8,loy:{berk:2,sevgi:3},news:'Holding siber saldırıyı resmen bildirdi; inceleme başladı.'}}]},
 {id:'teklif',who:'cem',title:'Banka: ani teminat talebi',text:'Cem: "Piyasa koşulları nedeniyle konsorsiyum ek teminat istiyor; yoksa limiti kısacağız."',opts:[
  {t:'Ek teminat ver (iştirak hissesi)',fx:{loy:{cem:3,kerem:-2},news:'Holding bankalara iştirak hisselerini ek teminat olarak verdi.',itibar:{}}},
  {t:'Kısmi erken ödeme yap',fx:{nakit:-90,loy:{cem:4,aylin:2},news:'Holding borcunun bir kısmını erken ödedi; bankalar yumuşadı.'}},
  {t:'Pazarlık et: faiz artışını kabul et',fx:{faiz:.6,loy:{cem:1},news:'Holding bankalarla yeni koşulları görüştü; borçlanma maliyeti yükseldi.'}}]},
 {id:'istifa',who:'aylin',title:'Kilit yönetici istifa edebilir',text:'Aylin: "Rakip bir banka bana teklif verdi. Burada hak ettiğim değeri görmüyorum; kararımı yarın vereceğim."',opts:[
  {t:'Pozisyon ve prim ver',fx:{nakit:-25,loy:{aylin:8,murat:-2},news:'CFO Aylin Demir, holdingde kalma kararı aldı.'}},
  {t:'Sadece kısa bir konuşma yap',fx:{loy:{aylin:2},news:''}},
  {t:'Giderse gitsin',fx:{loy:{aylin:-10,deniz:-3,can:-3},hisse:-1.5,news:'Kulis: CFO Aylin Demir\'in holdingden ayrılması konuşuluyor.'}}]},
 {id:'kur',who:'tolga',title:'Kur şoku',text:'Tolga: "Dolar bir günde sert yükseldi; döviz borçlarımızın TL karşılığı büyüdü. Yatırımcılar kaygılı."',opts:[
  {t:'Kurumsal yatırımcılara güven mesajı gönder',fx:{hisse:-.5,loy:{tolga:3},news:'Holding yatırımcılara kur riskine karşı koruma planı sundu.'}},
  {t:'Döviz riskini hemen hedge et (maliyet)',fx:{nakit:-55,hisse:.8,loy:{aylin:3},news:'Holding döviz riskini türev araçlarla kapattı.'}},
  {t:'Beklemeye al',fx:{hisse:-2,nakit:-30,loy:{tolga:-3},news:'Holding kur şokuna müdahale etmedi; borç yükü ağırlaştı.'}}]},
];
function applyFx(fx0,optText,c){
  const F=W.fin;
  if(fx0.nakit)F.nakit+=fx0.nakit;
  if(fx0.faiz)F.faiz=clamp(F.faiz+fx0.faiz,4,18);
  if(fx0.hisse){const pc=fx0.hisse/100;F.hisse*=1+pc;F.pv*=1+pc;sync(pc)}else sync();
  for(const id in (fx0.loy||{}))loyAdd(id,fx0.loy[id]);
  for(const id in (fx0.sus||{}))susAdd(id,fx0.sus[id]);
  if(fx0.itibar)Object.assign(W.hud.itibar,fx0.itibar);
  if(fx0.krizAdd&&!W.hud.krizler.includes(fx0.krizAdd))W.hud.krizler.push(fx0.krizAdd);
  if(fx0.news)news(fx0.news);
  W.chron.push(`Kriz: ${c.title} — karar: ${optText}`);W.chron=W.chron.slice(-25);
  recordDec(`${c.title}: ${optText}`,true);
  saveW();renderHudBar();refresh();
  if(S.model&&S.autoHud)gmTick(`Kriz kararı verildi (${c.title}): ${optText}. Panel durumunu tutarlı biçimde güncelle.`);
}
function crisisCard(){
  if(ringCur||ringQ.length)return false;
  const F=W.fin,last=W.crisisLast??-99,d=day(clkNow());
  if(d-last<10)return false;
  const pool=CRISES.filter(c=>live(c.who)&&c.id!==W.crisisPrev);
  if(!pool.length)return false;
  const c=pool[Math.floor(Math.random()*pool.length)];
  W.crisisLast=d;W.crisisPrev=c.id;
  ring({who:c.who,kind:'scene',title:'🚨 '+c.title,text:c.text,opts:c.opts.map(o=>o.t),def:c.opts.length-1,
    onAnswer:i=>{const o=c.opts[Math.max(0,Math.min(c.opts.length-1,i))];
      gmNote(current,`🚨 ${c.title}: "${o.t}" kararını verdin.`);applyFx(o.fx,o.t,c)}});
  notify(agent(c.who).name,'🚨 '+c.title,c.who);
  return true;
}
/* ---------- görevden alma (azil) ---------- */
function endGame(type,text){
  W.ended={type,t:clkNow()};news(text);W.chron.push(text);
  gmNote(current,'🏁 OYUN SONU — '+text+' Yeni oyun için ⚙️ menüsünden senaryo seç.');
  gmNote('g_genel','🏁 '+text);saveW();renderHudBar();refresh();
}
function azilCheck(o,n){
  if(W.ended||(W.you&&(W.you.caught||W.you.won)))return;
  const gap=Math.min(30,day(n)-day(o));
  W.oppDays=isOpp()?(W.oppDays||0)+gap:0;
  if(ringCur||ringQ.length)return;
  const y=W.hud.yk,boss=isBoss();
  const ready=boss?(W.oppDays>=14&&y.muhalif>y.sen):(W.oppDays>=21);
  if(!ready||day(n)-(W.azilDay??-99)<20)return;
  W.azilDay=day(n);
  const who=boss?(live('murat')?'murat':'kerem'):(live('faruk')?'faruk':'murat');
  const ids=['murat','kerem','orhan','sevgi','faruk'];
  const text=boss?`Muhalif üyeler olağanüstü YK toplantısı istedi: Başkanlıktan azil oylaması gündemde. Sayım: sen ${y.sen}, karşı ${y.muhalif}, kararsız ${y.kararsiz}. Nasıl karşılıyorsun?`
    :`Üst yönetim performansını ve sadakatini sorguluyor; görevinden alınman gündemde. Savunmanı nasıl yapacaksın?`;
  const opts=boss?['Üyelerle tek tek görüş, söz ver','Taviz paketi: temettü ve kadro sözü (-80 M₺)','Doğrudan oylamaya gir','İstifa et']
    :['Hatalarımı kabul edip hedef söz ver','Yeni bir projeyle kendimi kanıtla','Kendi isteğimle ayrılıyorum'];
  ring({who,kind:'scene',title:boss?'⚖️ Azil oylaması':'⚖️ Görevden alma görüşmesi',text,opts,def:opts.length-1,
    onAnswer:i=>{
      if(i===opts.length-1){endGame('istifa',boss?'Başkanlıktan istifa ettin; Soylu Holding\'in yönetimi muhaliflerin eline geçti.':'Görevinden ayrıldın; kariyerin Soylu Holding\'de sona erdi.');return}
      let bonus=0;
      if(boss){
        if(i===0){bonus=.15;['murat','kerem','orhan','sevgi'].forEach(x=>loyAdd(x,4))}
        else if(i===1){if(W.fin.nakit>=80){W.fin.nakit-=80;sync();bonus=.3;['murat','kerem','orhan','sevgi'].forEach(x=>loyAdd(x,8))}else{bonus=.05;sysNote('Taviz paketi için nakit yetmedi.')}}
        const al=avgLoy(['murat','kerem','orhan','sevgi']),pA=clamp((100-al)/100-bonus,.05,.95);
        const against=y.muhalif-Math.round(y.muhalif*bonus*.5)+Math.round(y.kararsiz*pA);   // ikna edilen muhalifler de oy değiştirebilir
        if(against>=5)endGame('azil',`YK ${against}-${9-against} oyla seni Başkanlıktan azletti.`);
        else{y.muhalif=Math.max(0,y.muhalif-1);y.sen=Math.min(9,y.sen+1);W.oppDays=0;W.oppStrikes=0;W.excl=[];
          news(`Başkan azil oylamasını ${9-against}-${against} kazandı; muhalefet geri çekildi.`);gmNote(current,`✅ Azil oylamasını atlattın (${9-against}-${against}).`);saveW();renderHudBar()}
      }else{
        bonus=i===0?8:i===1?14:0;
        const al=avgLoy(['faruk','murat','aylin','sevgi'])+bonus;
        if(al<45)endGame('azil','Üst yönetim görevine son verdi; Soylu Holding\'den ayrıldın.');
        else{W.oppDays=0;ids.forEach(x=>loyAdd(x,3));news('Yönetim, görevden alma kararından vazgeçti; sana bir şans daha verildi.');gmNote(current,'✅ Görevde kalmana karar verildi; ama gözler üzerinde.');saveW()}
      }
    }});
}
/* ---------- panel: finans, takvim, kararlar, sözler, belgeler ---------- */
function act(kind){
  if(!isBoss()){sysNote('Bu işlem sadece Yönetim Kurulu Başkanı\'nın yetkisinde.');return}
  const F=W.fin,amt=Math.abs(parseFloat($('rx_amt')?.value))||0;
  if(amt<=0)return;
  let txt,ok=true;
  if(kind==='temettu'){if(F.nakit<amt){sysNote('Nakit yetersiz.');return}snap('Temettü');F.nakit-=amt;F.lastTemettu=day(clkNow());txt=`Temettü dağıtımı: ${amt} M₺ ödendi.`;loyAdd('kerem',4);loyAdd('orhan',3);loyAdd('tolga',3);leakCheck(txt)}
  else if(kind==='borc'){const a=Math.min(amt,F.borc);if(F.nakit<a){sysNote('Nakit yetersiz.');return}snap('Borç ödeme');F.nakit-=a;F.borc-=a;txt=`Borç ödemesi: ${a} M₺ kapatıldı.`;loyAdd('cem',4);loyAdd('aylin',2)}
  else if(kind==='kredi'){snap('Yeni kredi');F.nakit+=amt*.99;F.borc+=amt;F.faiz=clamp(F.faiz+.3,4,18);txt=`Yeni kredi: ${amt} M₺ kullanıldı (%1 masraf, borçlanma maliyeti %${fx(F.faiz,1)}).`;loyAdd('cem',1);loyAdd('aylin',-1)}
  else if(kind==='varlik'){snap('Varlık satışı');F.nakit+=amt*.85;F.favok0-=amt*.05;txt=`Varlık satışı: ${amt} M₺ değerinde varlık %15 iskontoyla satıldı.`;loyAdd('hatice',-2);loyAdd('ali',-2);loyAdd('emre',-2);leakCheck(txt)}
  sync();
  gmNote('g_exco','💼 '+txt);news(txt);W.backDue=txt;
  recordDec(txt,true);renderHudBar();refresh();saveW();
  if(S.model&&S.autoHud)gmTick('Başkan finansal bir hamle yaptı: '+txt);
  consequences(txt);
}
function panelHtml(){
  const F=W.fin,boss=isBoss(),dis=boss?'':'disabled';
  const dayN=day(clkNow()),nextClose=(Math.floor(clkNow()/43200)+1)*43200-clkNow();
  let h=`<h3 id="rx_top">💰 Finans modeli</h3>`+
    kvh('Nakit',fx(F.nakit)+' M₺')+kvh('Toplam borç',fx(F.borc)+' M₺')+kvh('Net borç / FAVÖK',fx(borcX(),1)+'x')+kvh('FAVÖK (yıllık)',fx(favok())+' M₺')+
    kvh('Borçlanma maliyeti','%'+fx(F.faiz,1))+kvh('Aylık faiz gideri',fx(faizM(),1)+' M₺')+kvh('Son ay net nakit',F.lastNet===null?'(henüz kapanış yok)':(F.lastNet>=0?'+':'')+fx(F.lastNet,1)+' M₺')+
    kvh('30 gün acil ihtiyaç',fx(acil())+' M₺')+kvh('Sonraki ay kapanışı',fx(nextClose/1440,0)+' gün sonra')+kvh('Sonraki kredi taksiti',lbl(nextVade()));
  h+=`<div class="r2" style="margin-top:8px"><input id="rx_amt" type="number" min="1" value="120"><span class="mut" style="flex:0 0 30px;align-self:center">M₺</span></div>
  <div class="r2" style="margin-top:6px"><button class="btn" data-rx="temettu" ${dis}>💸 Temettü dağıt</button><button class="btn" data-rx="borc" ${dis}>🏦 Borç öde</button></div>
  <div class="r2" style="margin-top:6px"><button class="btn" data-rx="kredi" ${dis}>➕ Yeni kredi</button><button class="btn" data-rx="varlik" ${dis}>🏷 Varlık sat</button></div>
  ${boss?'':'<div class="mut">Finansal hamleler Başkan\'ın yetkisinde.</div>'}`;
  const ev=occ(clkNow(),clkNow()+14*1440).slice(0,8);
  h+=`<h3>📅 Takvim (14 gün)</h3>`+(ev.length?ev.map(e=>`<div class="kv"><span>${lbl(e.t)}</span><span>${esc(e.ad)}</span></div>`).join(''):'<div class="mut">Yakında bir olay yok.</div>')+`<div class="mut">Randevu eklemek için: /randevu 14:30 Cem ile görüşme</div>`;
  h+=`<h3>📒 Karar defteri</h3>`+((W.dec||[]).length?(W.dec||[]).slice(0,8).map(d=>`<div class="rxrow"><span>${esc(d.no)} · ${esc(d.text)}</span><span class="mut">${esc(d.oy)}</span></div>`).join(''):'<div class="mut">Henüz karar yok. Sohbete /karar <metin> yaz.</div>');
  h+=`<h3>🤝 Verilen sözler</h3>`+((W.prom||[]).length?(W.prom||[]).slice(0,8).map(p=>`<div class="rxrow"><span>${esc(fnm(agent(p.who)?.name))}: ${esc(p.text)} <span class="mut">${p.st==='open'?'· vade '+lbl(p.due):p.st==='kept'?'· ✔ tutuldu':'· ✖ tutulmadı'}</span></span>${p.st==='open'?`<span><button data-rxp="${p.id}:1">✔ Tuttum</button><button data-rxp="${p.id}:0">✖</button></span>`:''}</div>`).join(''):'<div class="mut">Henüz söz yok. /söz Aylin 30 bütçeyi artıracağım</div>');
  h+=`<h3>📎 Belgeler</h3>`+((W.docs||[]).length?(W.docs||[]).slice(0,10).map(d=>`<div class="rxrow"><span class="l" data-rxd="${d.id}">📎 ${esc(d.title)}</span><span class="mut">${esc(fnm(agent(d.from)?.name))}</span></div>`).join(''):'<div class="mut">Henüz belge yok; ay kapanışında gelmeye başlar.</div>');
  if(W.goals)h+=goalsBlock();
  if(W.you)h+=youBlock();
  if(W.mole)h+=`<h3>🐀 Köstebek avı</h3><div class="kv"><span>Durum</span><span>${W.mole.ids.length?'İçeride hâlâ köstebek var':'Temizlendi'}</span></div><div class="kv"><span>Yakalananlar</span><span>${W.mole.gone.map(i=>fnm(agent(i)?.name)).join(', ')||'-'}</span></div><div class="kv"><span>Yanlış suçlama</span><span>${W.mole.wrong}</span></div><div class="mut">İpuçları Nazlı (iç denetim) ve Berk'ten (BT) gelir. Suçlamak için: /ifşa Cem</div>`;
  if((W.pend||[]).length)h+=`<div class="mut" style="margin-top:8px">⏳ Yolda ${(W.pend||[]).length} gelişme var (zaman ilerledikçe gerçekleşir).</div>`;
  return h;
}
{const _rh=renderHud;renderHud=function(){
  _rh();
  try{
    if(!ensure())return;
    const anchor=[...$('pnlp').querySelectorAll('h3')].find(h=>/^Yönetim Kurulu/.test(h.textContent));
    if(anchor)anchor.insertAdjacentHTML('beforebegin',panelHtml());else $('pnlp').insertAdjacentHTML('beforeend',panelHtml());
    const keep=()=>{const a=$('pnl').scrollTop,b=$('pnlp').scrollTop;renderHud();$('pnl').scrollTop=a;$('pnlp').scrollTop=b};
    $('pnlp').querySelectorAll('[data-rx]').forEach(b=>b.onclick=()=>{act(b.dataset.rx);keep()});
    $('pnlp').querySelectorAll('[data-rxp]').forEach(b=>b.onclick=()=>{const [id,v]=b.dataset.rxp.split(':');promResolve(id,v==='1');keep()});
    $('pnlp').querySelectorAll('[data-rxd]').forEach(b=>b.onclick=()=>showDoc(b.dataset.rxd));
  }catch(e){console.error('realism panel',e)}
}}

/* ---------- komutlar: /karar /söz /randevu /takvim /finans ---------- */
{const _snd=send;send=function(text){
  const t=String(text||'').trim();
  if(W&&(W.ended||(W.you&&(W.you.caught||W.you.won)))&&!/^\/(yardım|help|komut)/i.test(t)){sysNote('🏁 Oyun bitti. Yeni oyun için ⚙️ menüsünden senaryo seç.');return}
  if(W&&/^\/(karar|söz|soz|randevu|takvim|finans|ifşa|ifsa|köstebek|kostebek|sızdır|sizdir|rapor)\b/i.test(t)){
    ensure();const m=t.match(/^\/([a-zçğıöşü]+)\s*([\s\S]*)$/i),cmd=m[1].toLowerCase(),arg=m[2].trim();
    $('text').value='';syncAct();
    if(cmd==='karar'){
      if(!isBoss()){sysNote('Karar yetkisi Başkan\'dadır.');return}
      if(!arg){sysNote('Kullanım: /karar <metin>. Örn: /karar Demir-Çelik için 40 M₺ yatırım onaylandı.');return}
      const d=recordDec(arg,false);gmNote(current,`📒 Karar defterine işlendi: ${d.no} · ${arg} · oy ${d.oy}`);
    }else if(cmd==='söz'||cmd==='soz'){
      const pm=arg.match(/^(\S+)\s+(?:(\d+)\s*(?:gün|g)?\s+)?([\s\S]+)$/i);
      const who=pm&&addressed(pm[1],S.agents.filter(a=>live(a.id)))[0];
      if(!who){sysNote('Kullanım: /söz Aylin 30 bütçeyi artıracağım  (isim, gün, söz)');return}
      const days=clamp(parseInt(pm[2])||14,1,180);
      W.prom=[{id:'p'+Date.now(),who:who.id,text:pm[3].slice(0,100),due:clkNow()+days*1440,st:'open'},...(W.prom||[])].slice(0,20);
      loyAdd(who.id,2);saveW();gmNote(current,`🤝 ${fnm(who.name)}'e söz verildi (vade ${days} gün): ${pm[3]}`);
    }else if(cmd==='randevu'){
      const tm=arg.match(/^(\d{1,2})[:.](\d{2})\s+([\s\S]+)$/);
      if(!tm){sysNote('Kullanım: /randevu 14:30 Cem ile görüşme');return}
      let tt=day(clkNow())*1440+(+tm[1])*60+(+tm[2]);if(tt<=clkNow())tt+=1440;
      (W.cal||(W.cal=[])).push({id:'c'+Date.now(),t:tt,text:tm[3].slice(0,80),done:false});saveW();
      gmNote(current,`📅 Randevu eklendi: ${lbl(tt)} · ${tm[3]}`);
    }else if(cmd==='sızdır'||cmd==='sizdir'||cmd==='rapor'){
      youCmd(cmd==='rapor'?'rapor':'sizdir',arg);
    }else if(cmd==='ifşa'||cmd==='ifsa'||cmd==='köstebek'||cmd==='kostebek'){
      accuse(arg);
    }else if(cmd==='takvim'){
      sysNote('📅 '+(occ(clkNow(),clkNow()+14*1440).slice(0,6).map(e=>`${lbl(e.t)} ${e.ad}`).join(' · ')||'Yakında olay yok.'));
    }else{
      const F=W.fin;sysNote(`💰 Nakit ${fx(F.nakit)} M₺ · borç ${fx(F.borc)} M₺ (${fx(borcX(),1)}x) · maliyet %${fx(F.faiz,1)} · aylık faiz ${fx(faizM(),1)} M₺ · son ay net ${F.lastNet===null?'-':fx(F.lastNet,1)+' M₺'}`);
    }
    return;
  }
  if(W&&/^\/(yardım|help|komut)\b/i.test(t)){_snd(text);sysNote('Gerçekçilik komutları: /karar <metin> · /söz <isim> <gün> <söz> · /randevu 14:30 <konu> · /takvim · /finans · /ifşa <isim>');return}
  return _snd(text);
}}

/* ---------- ayarlar: bildirim + kayıt yuvaları ---------- */
const slotKey=n=>'hold_slot_'+n;
function trimM(){const o={};for(const k in M)o[k]=M[k].slice(-100);return o}
function loadData(data){
  epoch++;chainGen++;ctrls.forEach(c=>c.abort());ctrls.clear();stopSpeech();stopListening();
  taskTimers.forEach(t=>clearTimeout(t));taskTimers.clear();clearTimeout(tickTimer);typing={};backBusy=false;ticking=false;
  W=data.W;M=data.M||{};unread={};snaps.length=0;applyOrg();ensure();
  saveW();jset('hold_m',M);renderHudBar();renderTasks();(W.tasks||[]).forEach(armTask);openChat('g_genel');updateUndo();
  $('cfg').classList.remove('open');
}
{const _rc=renderCfg;renderCfg=function(){
  _rc();
  try{
    const p=$('cfgp');
    const sl=n=>{const s=jget(slotKey(n),null);return `<div class="rxrow"><span>Yuva ${n}: <span class="mut">${s?esc(s.label):'(boş)'}</span></span><span><button data-sv="${n}">Kaydet</button>${s?`<button data-ld="${n}">Yükle</button>`:''}</span></div>`};
    p.insertAdjacentHTML('beforeend',`<h3>💾 Kayıt yuvaları</h3>${sl(1)}${sl(2)}${sl(3)}
      <div class="r2" style="margin-top:8px"><button class="btn" id="rx_exp">⬇ JSON yedeği</button><button class="btn" id="rx_imp">⬆ JSON yükle</button></div><input type="file" id="rx_file" accept=".json" style="display:none">
      <h3>🔔 Bildirimler</h3><div class="chk"><input type="checkbox" id="rx_n"><span>Tarayıcı bildirimi (sekme arka plandayken)</span></div><div class="chk"><input type="checkbox" id="rx_s"><span>Bildirim sesi</span></div>`);
    p.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>{if(!W){return}jset(slotKey(b.dataset.sv),{label:`${clkStr()} · ${W.hud.tarih} · ${W.hud.finans.nakit}`,t:Date.now(),W,M:trimM()});renderCfg()});
    p.querySelectorAll('[data-ld]').forEach(b=>b.onclick=()=>{const s=jget(slotKey(b.dataset.ld),null);if(s&&confirm('Mevcut oyun silinip bu kayıt yüklenecek. Emin misin?'))loadData(s)});
    $('rx_exp').onclick=()=>{if(!W)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({v:1,W,M:trimM()})],{type:'application/json'}));a.download='soylu-holding-kayit.json';a.click()};
    $('rx_imp').onclick=()=>$('rx_file').click();
    $('rx_file').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!d.W||!d.W.hud)throw 0;if(confirm('Mevcut oyun silinip bu yedek yüklenecek. Emin misin?'))loadData(d)}catch(x){alert('Geçersiz yedek dosyası.')}})};
    $('rx_n').checked=!!S.rxNotify;$('rx_n').onchange=e=>{S.rxNotify=e.target.checked;saveS();if(S.rxNotify&&window.Notification&&Notification.permission==='default')Notification.requestPermission()};
    $('rx_s').checked=S.rxSound!==false;$('rx_s').onchange=e=>{S.rxSound=e.target.checked;saveS()};
  }catch(e){console.error('realism cfg',e)}
}}

/* ---------- üst çubukta kısayol ---------- */
{const b=document.createElement('button');b.className='ib';b.id='rxbtn';b.title='Finans, takvim, kararlar';b.textContent='💰';
 document.querySelector('#side .top > div').prepend(b);
 b.onclick=()=>{openHud();setTimeout(()=>{const t=$('rx_top'),p=$('pnlp');if(t&&p)p.scrollTop+=t.getBoundingClientRect().top-p.getBoundingClientRect().top;window.scrollTo(0,0)},50)}}
/* sayfanın kendisi asla kaymasın (sadece iç paneller kayar) */
document.documentElement.style.overflow='hidden';
const fixScroll=()=>{if(window.scrollX||window.scrollY)window.scrollTo(0,0);const s=document.scrollingElement;if(s&&(s.scrollTop||s.scrollLeft)){s.scrollTop=0;s.scrollLeft=0}if(document.body.scrollTop||document.body.scrollLeft){document.body.scrollTop=0;document.body.scrollLeft=0}};
window.addEventListener('scroll',fixScroll,true);fixScroll();

/* ---------- başlangıç ---------- */
window.rx={newQuarter,closeQuarter,crisisCard,azilCheck,endGame,CRISES,youLeak,youTick,youCaught,setupYou,moleTick,accuse,setupMoles,pressure,memSummarize,defenseCtx,partnerEvents,maybeKnock,KNOCK,tryInvite,isOpp,groupCheck,ykEvent,ensure,monthClose,ring,addDoc,fireEv,occ,act,adopt,sync};
if(W){try{syncGroups();applyOrg();ensure();W.dec=W.dec||[];W.docs=W.docs||[];W.pend=W.pend||[];W.prom=W.prom||[];W.cal=W.cal||[];renderList()}catch(e){console.error(e)}}
})();

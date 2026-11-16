import {addDoc,monthDoc} from './documents.js';
import {ring} from './ring.js';
import {on} from '../hooks.js';
import {clamp,day,fx,num,rnd} from '../lib/num.js';
import {crisis,dm,hit,live,loyAdd,news} from '../lib/world.js';
import {state} from '../state.js';
import {clkNow} from '../ui-list.js';
/* ================= Finans modeli (TL): nakit, borç, FAVÖK, faiz, rating; aylık kapanış =================
   W.fin'de yaşar; panel (W.hud.finans) sync() ile güncellenir. GM paneli değiştirirse adopt() modeli ona uydurur. */
export const RATE={g:54,y:12,r:-36};                    // iştirak başına aylık nakit katkısı (M₺) — durum rengine göre
export const isum=()=>(state.W.hud.istirakler||[]).reduce((s,i)=>s+(RATE[i.d]??0),0);
export function ensure(){
  if(!state.W||!state.W.hud)return false;
  if(state.W.fin)return true;
  const f=state.W.hud.finans, favok0=1320, bx=num(f.borc,3.5);
  state.W.fin={nakit:num(f.nakit,600),favok0,borc:bx*favok0,faiz:state.W.calm?7:10.5,gider:19,pv:num(f.piyasa,3),hisse:num(f.hisse,80),
    isum0:isum(),lastNet:null,lastParts:[],month:Math.floor(clkNow()/43200),tier:null,lastTemettu:null,lastBank:-999,lastAnk:-999,sceneDay:-99,sceneLog:[]};
  state.W.dec=state.W.dec||[];state.W.docs=state.W.docs||[];state.W.pend=state.W.pend||[];state.W.prom=state.W.prom||[];state.W.cal=state.W.cal||[];
  return true;
}
export const favok=()=>Math.max(240,state.W.fin.favok0+12*(isum()-state.W.fin.isum0));
export const borcX=()=>Math.max(.3,state.W.fin.borc/favok());
export const faizM=()=>state.W.fin.borc*state.W.fin.faiz/100/12;
export function acil(){
  const neg=(state.W.hud.istirakler||[]).reduce((s,i)=>s+Math.min(0,RATE[i.d]??0),0);
  return Math.max(30,state.W.fin.gider+faizM()-neg+(nextVade()-clkNow()<43200?state.W.fin.borc*.1:0));
}
export const TIERS=['CC','CCC','CCC+','B','B+','BB','BB+'];
export function tierNow(){const b=borcX();return state.W.fin.nakit<0?'CC':b>7?'CCC':b>5.5?'CCC+':b>4.2?'B':b>3.2?'B+':b>2.4?'BB':'BB+'}
export function sync(pct){   // modeldeki sayıları panele (hud) yaz
  const f=state.W.hud.finans,F=state.W.fin;
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
export function adopt(){   // GM panelde nakit/borç/hisse değiştirdiyse modeli ona uydur
  const f=state.W.hud.finans,F=state.W.fin; if(!F)return;
  F.nakit=num(f.nakit,F.nakit); F.borc=num(f.borc,borcX())*favok(); F.hisse=num(f.hisse,F.hisse); F.pv=num(f.piyasa,F.pv);
}
on('afterGmTick',({finansBefore:b})=>{if(state.W&&state.W.fin&&JSON.stringify(state.W.hud.finans)!==b)adopt()});

export function nextVade(){const d=day(clkNow());for(let k=d;k<d+400;k++)if(k%180===170)return k*1440+540;return clkNow()+1e6}
/* ---------- aylık kapanış ---------- */
export function monthClose(k,log){
  const F=state.W.fin;
  const parts=(state.W.hud.istirakler||[]).map(i=>({ad:i.ad,v:(RATE[i.d]??0)*rnd(.8,1.2)}));
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
  }else if(F.nakit<acil()&&live('aylin')&&!state.W.calm){
    ring({who:'aylin',text:`${hit()}, nakit ${fx(F.nakit)} M₺; 30 günlük ihtiyacımız ${fx(acil())} M₺. Acil karar gerekiyor.`,
      hint:`Nakit ${fx(F.nakit)} M₺, 30 günlük ihtiyaç ${fx(acil())} M₺. CFO olarak endişeni açık söyle ve somut bir öneri (varlık satışı, yeni kredi, temettü erteleme) sun; en fazla 3 cümle.`,loy:[2,-2]});
  }
  if(/soğuk|vdk|mesafeli/i.test(state.W.hud.itibar.ankara||'')&&d-F.lastAnk>=40&&Math.random()<.35&&live('hakan')){F.lastAnk=d;
    ring({who:'hakan',text:`${hit()}, Ankara'dan bazı sinyaller var; telefonda anlatmak istemem.`,
      hint:`Ankara'dan hoş olmayan sinyaller aldın (VDK, ihale, soğuma). Başkan'a ima dolu, bedelini de hissettiren kısa bir bilgi ver; en fazla 3 cümle.`,loy:[1,-2]});
  }
  if(k%3===0&&live('nazli')&&!state.W.calm){
    const red=(state.W.hud.istirakler||[]).find(i=>i.d==='r');
    addDoc('nazli','İç Denetim Bulgu Notu',`Konu: ${red?red.ad:'Grup'} · çeyreklik denetim\nBulgu: Harcama onay matrisine aykırı iki ödeme ve gecikmiş mutabakat tespit edilmiştir.\nRisk: Orta. Denetim Komitesi'ne (Prof. Dr. Orhan Aksoy) raporlanmıştır.\n\nNazlı Erdoğan, İç Denetim Müdürü`);
  }
}

/* ---------- kancalar ---------- */
on('gameStarted',()=>ensure(),10);
on('time:advance',({months,log})=>months.slice(-3).forEach(k=>monthClose(k,log)),10);   // biriken ay kapanışları (en fazla 3)

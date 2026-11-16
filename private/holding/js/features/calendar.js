import {addDoc} from './documents.js';
import {acil,borcX,ensure,faizM,favok,sync} from './finance.js';
import {ykEvent} from './groups.js';
import {ring} from './ring.js';
import {addFilter,on} from '../hooks.js';
import {clamp,day,fx,rnd} from '../lib/num.js';
import {crisis,dm,gmNote,hit,lbl,loyAdd,news} from '../lib/world.js';
import {state} from '../state.js';
import {clkNow} from '../ui-list.js';
/* ================= Takvim: sabit kurumsal olaylar (YK, bütçe, PPK, bilanço, GK, temettü, kredi vadesi) + kullanıcı randevuları (W.cal) ================= */
export const CAL=[
  {id:'yk',ad:'Haftalık YK toplantısı',when:d=>d%7===3?840:null,kind:'yk'},
  {id:'butce',ad:'Aylık bütçe & nakit toplantısı',when:d=>d%30===1?600:null,kind:'butce'},
  {id:'ppk',ad:'Merkez Bankası PPK kararı',when:d=>d%30===14?840:null,kind:'ppk'},
  {id:'bilanco',ad:'Çeyrek sonu bilanço / KAP',when:d=>d%90===85?600:null,kind:'bilanco'},
  {id:'gk',ad:'Olağan Genel Kurul',when:d=>d%360===120?600:null,kind:'gk'},
  {id:'temettu',ad:'Temettü ödeme tarihi',when:d=>d%360===150?540:null,kind:'temettu'},
  {id:'vade',ad:'Sendikasyon kredisi taksit vadesi',when:d=>d%180===170?540:null,kind:'vade'},
];
export function occ(o,n){
  const out=[];
  for(let d=day(o);d<=day(n);d++)for(const c of CAL){const m=c.when(d);if(m===null)continue;const t=d*1440+m;if(t>o&&t<=n)out.push({t,kind:c.kind,ad:c.ad})}
  (state.W.cal||[]).forEach(u=>{if(!u.done&&u.t>o&&u.t<=n)out.push({t:u.t,kind:'user',ad:u.text,u})});
  return out.sort((a,b)=>a.t-b.t);
}
export function fireEv(e,log){
  const F=state.W.fin;
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
    addDoc('tolga','Çeyrek Finansal Rapor Özeti (KAP)',`SOYLU HOLDİNG A.Ş. · ÇEYREK SONU\nNakit: ${fx(F.nakit)} M₺\nToplam borç: ${fx(F.borc)} M₺ · Net borç/FAVÖK: ${fx(borcX(),1)}x\nYıllıklandırılmış FAVÖK: ${fx(favok())} M₺\nBorçlanma maliyeti: %${fx(F.faiz,1)}\nKredi notu: ${state.W.hud.finans.rating}\nHisse: ${state.W.hud.finans.hisse}\n\nYatırımcı İlişkileri · Tolga Başar`);
  }else if(e.kind==='gk'){
    const od=F.lastTemettu!==null&&day(clkNow())-F.lastTemettu<360;
    news(od?'Olağan Genel Kurul toplandı; temettü dağıtımı onaylandı, toplantı sakin geçti.':'Olağan Genel Kurul toplandı; temettü çıkmadığı için küçük hissedarlar tepkili.');
    if(!od){loyAdd('orhan',-2);loyAdd('tolga',-2);loyAdd('kerem',-2);state.W.hud.itibar.medya='Küçük hissedar tepkisi'}
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

/* ---------- kancalar ---------- */
on('time:advance',({from,to,log})=>{   // aralıkta düşen olaylar (en fazla 8, sondan)
  let evs=occ(from,to);if(evs.length>8)evs=evs.slice(-8);
  evs.forEach(e=>{try{fireEv(e,log)}catch(x){console.error(x)}});
},20);
addFilter('ctxExtra',(s,a)=>{
  if(!ensure()||a.id==='gm')return s;
  const up=occ(clkNow(),clkNow()+7*1440).slice(0,3).map(e=>`${lbl(e.t)} ${e.ad}`).join('; ');
  if(up)s+=`\nYAKIN TAKVİM: ${up}.`;
  return s;
},30);
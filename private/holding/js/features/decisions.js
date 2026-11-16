import {api,hdrs,hudLine} from '../ai-core.js';
import {roleBlock} from '../data.js';
import {ensure,sync} from './finance.js';
import {leakCheck} from './leak.js';
import {addFilter,emit,on} from '../hooks.js';
import {notify} from '../lib/notify.js';
import {clamp,rnd} from '../lib/num.js';
import {$} from '../lib/util.js';
import {dm,gmNote,hit,lbl,live,loyAdd,news,susAdd} from '../lib/world.js';
import {renderHud} from '../panel.js';
import {agent,fnm,saveW,state} from '../state.js';
import {clkNow} from '../ui-list.js';
/* ================= Kararlar ve sözler: karar defteri (W.dec), kararın zamanla doğurduğu sonuçlar (W.pend), verilen sözler (W.prom) ================= */
/* ---------- bekleyen sonuçlar (karar → zaman içinde gerçekleşen etkiler) ---------- */
export function firePend(p,log){
  const F=state.W.fin;
  if(p.nakit)F.nakit+=p.nakit;
  if(p.hisse_pct){const pc=p.hisse_pct/100;F.hisse*=1+pc;F.pv*=1+pc;sync(pc)}else sync();
  for(const id in (p.sadakat||{}))loyAdd(id,p.sadakat[id]);
  news(p.olay);gmNote('g_genel','🔔 '+p.olay);notify('Gelişme',p.olay,'ch_haber');log.push(p.olay);
}
export async function consequences(text){
  if(!state.S.model||state.W.calm&&false)return;
  const ep=state.epoch,ids=state.S.agents.filter(a=>live(a.id)).map(a=>a.id).join(',');
  const prompt=`Sen bir holding rol yapma oyununun olay motorusun. Aşağıdaki YK kararının ZAMAN İÇİNDE doğuracak 1-3 gerçekçi sonucunu planla (piyasa, banka, medya, sendika, aile). Küçük ve nedensel olsun${state.W.calm?', sakin senaryo: kriz uydurma':''}. SADECE JSON döndür:\n{"sonuclar":[{"gun":3,"olay":"kısa haber cümlesi","nakit":-30,"hisse_pct":-2,"sadakat":{"ajan_id":-4}}]}\ngun 1-45 arası; nakit -240..240 (M₺); hisse_pct -8..8; sadakat -12..12.\nAjan idleri: ${ids}\nKARAR: ${text}\nDURUM: ${hudLine()}`;
  try{
    const r=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),body:JSON.stringify({model:state.S.model,messages:[{role:'user',content:roleBlock()+prompt}],stream:false,max_tokens:500})});
    if(!r.ok)return;const tx=(await r.json()).choices?.[0]?.message?.content||'';if(ep!==state.epoch)return;
    const j=JSON.parse(tx.slice(tx.indexOf('{'),tx.lastIndexOf('}')+1));
    (j.sonuclar||[]).slice(0,3).forEach(s=>{
      if(!s||typeof s.olay!=='string')return;
      const sad={};for(const k in (s.sadakat||{}))if(live(k)&&isFinite(+s.sadakat[k]))sad[k]=clamp(+s.sadakat[k],-12,12);
      (state.W.pend||(state.W.pend=[])).push({due:clkNow()+clamp(parseInt(s.gun)||3,1,45)*1440+Math.floor(rnd(60,600)),olay:s.olay.slice(0,160),nakit:clamp(+s.nakit||0,-240,240),hisse_pct:clamp(+s.hisse_pct||0,-8,8),sadakat:sad});
    });saveW();if($('pnl').classList.contains('open'))renderHud();
  }catch(e){}
}
/* ---------- karar defteri ---------- */
export function recordDec(text,auto){
  ensure();const n=(state.W.dec||[]).length+1;
  const d={no:`2026/${String(n).padStart(3,'0')}`,t:clkNow(),text:text.slice(0,200),oy:`${state.W.hud.yk.sen}-${state.W.hud.yk.muhalif}-${state.W.hud.yk.kararsiz}`,auto:!!auto};
  state.W.dec=[d,...(state.W.dec||[])].slice(0,40);
  emit('decisionRecorded',{d,auto:!!auto});
  state.W.chron.push(`Karar ${d.no}: ${d.text}`);state.W.chron=state.W.chron.slice(-25);
  decEffects(text);leakCheck(text);
  if(!auto)consequences(text);
  saveW();return d;
}
export function decEffects(t){
  if(/rüşvet|insider|içeriden|ilişkili taraf|kara para|vergi kaçır|sahte/i.test(t)){
    loyAdd('sevgi',-4);loyAdd('orhan',-5);loyAdd('nazli',-4);susAdd('sevgi',5);state.W.hud.itibar.spk='İnceleme riski arttı';
    dm('sevgi',`${hit()}, bu karar TTK ve SPK açısından ağır risk taşıyor; gerekirse muhalefet şerhi düşmek zorunda kalırım.`);
  }
  if(/işten çıkar|kadro daral|toplu çıkış/i.test(t)){loyAdd('hatice',-6);loyAdd('selin',-3);loyAdd('ali',-2)}
  if(/zam|prim|ikramiye/i.test(t)){loyAdd('hatice',4);loyAdd('selin',3);loyAdd('ali',3)}
}
/* ---------- sözler ---------- */
export function promResolve(id,ok){
  const p=(state.W.prom||[]).find(x=>x.id===id);if(!p||p.st!=='open')return;
  p.st=ok?'kept':'broken';loyAdd(p.who,ok?6:-8);if(!ok)susAdd(p.who,6);
  state.W.chron.push(`Başkan ${fnm(agent(p.who).name)}'e verdiği sözü ${ok?'tuttu':'tutamadı'}: ${p.text}`);saveW();
}

/* ---------- kancalar ---------- */
on('time:advance',({to,log})=>{   // vadesi gelen karar sonuçları
  const due=(state.W.pend||[]).filter(p=>p.due<=to);state.W.pend=(state.W.pend||[]).filter(p=>p.due>to);due.forEach(p=>firePend(p,log));
},30);
on('time:advance',({to,log})=>{   // vadesi geçen sözler
  (state.W.prom||[]).forEach(p=>{if(p.st==='open'&&p.due<=to){p.st='broken';loyAdd(p.who,-8);susAdd(p.who,6);dm(p.who,`${hit()}, "${p.text}" sözünüzün vadesi geçti; hâlâ bekliyoruz.`);log.push('Söz tutulmadı: '+p.text)}});
},35);
addFilter('ctxExtra',(s,a)=>{
  if(!ensure()||a.id==='gm')return s;
  const dec=(state.W.dec||[]).slice(0,4).map(d=>`${d.no}: ${d.text}`).join('; ');
  if(dec)s+=`\nSON ALINAN KARARLAR (tutarlı davran, çelişki varsa belirt): ${dec}.`;
  return s;
},10);
addFilter('ctxExtra',(s,a)=>{
  if(!ensure()||a.id==='gm')return s;
  const pr=(state.W.prom||[]).filter(p=>p.who===a.id&&p.st==='open').map(p=>`"${p.text}" (vade ${lbl(p.due)})`).join('; ');
  if(pr)s+=`\nBAŞKAN'IN SANA VERDİĞİ AÇIK SÖZLER (tutmazsa kırılırsın): ${pr}.`;
  return s;
},20);
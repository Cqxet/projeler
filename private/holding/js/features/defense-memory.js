import {api,hdrs,runAgent} from '../ai-core.js';
import {loyOf} from '../data.js';
import {ensure} from './finance.js';
import {addFilter,on} from '../hooks.js';
import {day} from '../lib/num.js';
import {dm,hit,live} from '../lib/world.js';
import {agent,fired,msgs,saveW,state} from '../state.js';
import {clkNow} from '../ui-list.js';
/* ---------- savunma: kriz anında sadık ajanlar yanında durur ---------- */
export const hasRivals=()=>state.S.agents.some(x=>x.grp==='rival'&&!fired(x.id));
export function defenseCtx(a){
  if(a.id==='gm')return '';
  const krz=(state.W.hud.krizler||[]).length>0||hasRivals();
  if(a.grp==='rival')return `\nKARŞI TARAFSIN: Soylu Holding'in çalışanı değilsin; Başkan'a karşı baskı kurarsın, kimse seni savunmaz. Teklifinin/çıkarının peşinden git, süre ve baskı ekle, ama gerçekçi ve profesyonel kal.`;
  if(!krz)return '';
  const l=loyOf(a.id),att=(state.W.hud.krizler||[]).slice(0,2).join(' / ')||'dış baskı';
  if(l>=55)return `\nSAVUNMA GÖREVİN: Başkan şu an saldırı/baskı altında (${att}). Sana sadakatin yüksek: onu yalnız bırakma, ona karşı çıkanlara ve karşı tarafa karşı onun yanında durup savun. Kendi rolünün/uzmanlığının gücüyle SOMUT bir argüman ya da hamle getir (hukuki dayanak, finansal veri, hissedar/medya/Ankara tarafı, savunma seçenekleri: zehir hapı, beyaz şövalye, Pac-Man, vekâlet toplama vb.). Bu anda [PAS] yazma; boş onay yerine yardım et. Önceki cevaplarında söylediklerini tekrar etme.`;
  if(l>=35)return `\nTARAF TUTMA: Başkan baskı altında (${att}). Sadakatin orta: duruma ve Başkan'ın gücüne bakarak temkinli ve kendi çıkarına uygun konuş; açıkça karşı çıkma ama gerekirse küçük bir şart ya da destek koş.`;
  return `\nFIRSATÇILIK: Başkan baskı altında (${att}). Sadakatin düşük: mesafeli ve çıkarcı ol, riskleri vurgula, gerekirse karşı tarafla ya da güçlü olanla işbirliğine meyil göster.`;
}
addFilter('sysPrompt',(s,a,chat)=>{
  try{const mm=state.W?.mem?.[chat];if(mm)s+=`\n\nBU YAZIŞMANIN ESKİ KISMININ ÖZETİ (hafızan; unutma, tutarlı davran):\n${mm}`}catch(e){}
  return s;
});
/* ---------- hafıza: pencereden çıkan eski mesajlar özetlenip saklanır ---------- */
export const memBusy={};
export async function memSummarize(chat){
  if(!state.S.model||!state.W||memBusy[chat])return;
  const l=msgs(chat),T=(state.W.memT||(state.W.memT={}))[chat]||0,to=l.length-40;
  const chunk=l.slice(0,Math.max(0,to)).filter(m=>!m.act&&m.t>T);
  if(chunk.length<14)return;
  memBusy[chat]=1;const ep=state.epoch,last=chunk[chunk.length-1].t;
  try{
    const old=(state.W.mem||(state.W.mem={}))[chat]||'';
    const tr=chunk.map(m=>`${m.who==='user'?'BAŞKAN':agent(m.who)?.name||'?'}: ${String(m.text).slice(0,260)}`).join('\n');
    const prompt=`Aşağıdaki rol yapma sohbetinin ESKİ özeti ve yeni geçen konuşmalar var. Bunları tek bir güncel özet hâlinde birleştir: alınan kararlar, verilen sözler, taraflar (kim kimi destekliyor/karşı), açık konular, duygusal durum ve önemli rakamlar korunsun. En fazla 900 karakter, Türkçe, maddesiz düz metin.\n\nESKİ ÖZET: ${old||'(yok)'}\n\nYENİ KONUŞMALAR:\n${tr}`;
    const r=await fetch(api('/chat/completions'),{method:'POST',headers:hdrs(),body:JSON.stringify({model:state.S.model,messages:[{role:'user',content:prompt}],stream:false,max_tokens:450})});
    if(!r.ok||ep!==state.epoch)return;
    const tx=((await r.json()).choices?.[0]?.message?.content||'').trim();
    if(tx){state.W.mem[chat]=tx.slice(0,1100);state.W.memT[chat]=last;saveW()}
  }catch(e){}finally{memBusy[chat]=0}
}
on('messagePushed',({chat,m})=>{if(m&&!m.act&&m.who!=='gm')memSummarize(chat)},10);
/* ---------- baskı dalgası: karşı taraf zaman ilerledikçe baskı yapar, sadıklar savunur ---------- */
export const PRESS=[
  'Teklifimizin süresi doluyor. Yönetim kurulunuz bu hafta kararını açıklamazsa doğrudan hissedarlara gidiyoruz.',
  'Küçük hissedarlarla temas kurduk; çoğu bizim fiyatımıza sıcak. Vekâlet toplantısına hazırlanın.',
  'Pay oranımız yükseldi. SPK bildirimimizi yaptık; konuşmak için hâlâ kapı açığız ama sabrımız sınırlı.',
  'Basına bir bilgi notu geçeceğiz. İsterseniz önce telefonda, kendi cümlelerinizle konuşalım.',
];
export function pressure(){
  if(!state.W||!state.W.fin||state.W.you)return;
  const rv=state.S.agents.filter(x=>x.grp==='rival'&&live(x.id));if(!rv.length||state.W.calm)return;
  const F=state.W.fin,d=day(clkNow());if(d-(F.pressDay??-9)<3)return;F.pressDay=d;
  const r=rv[Math.floor(Math.random()*rv.length)],txt=PRESS[Math.floor(Math.random()*PRESS.length)];
  if(state.S.model)runAgent(r,r.id,`Başkan'a özelden yazıyorsun: Borealis Capital adına bir sonraki baskı hamlesini yap (süre, hissedar baskısı, basın ya da SPK). Soğuk ve profesyonel, en fazla 2 cümle.`,99,true);
  else dm(r.id,txt);
  state.W.chron.push(`${r.name} (Borealis) Başkan'a yeni bir baskı mesajı gönderdi.`);state.W.backDue='Borealis baskı yaptı';
  // sadık biri 10 sn sonra savunur
  const EXP=['sevgi','aylin','tolga','ece','hakan','murat'],sc=x=>loyOf(x.id)+(EXP.includes(x.id)?40:0);
  const def=state.S.agents.filter(x=>x.grp!=='rival'&&live(x.id)&&loyOf(x.id)>=55).sort((a,b)=>sc(b)-sc(a))[0];
  if(def)setTimeout(()=>{if(!state.W||!live(def.id))return;
    if(state.S.model)runAgent(def,def.id,`Borealis'in yeni baskı hamlesini duydun (${state.W.hud.krizler.join('; ')}). Başkan'a özelden, kendi uzmanlığınla somut bir savunma/öneri yaz; yanında olduğunu hissettir. En fazla 2 cümle.`,99,true);
    else dm(def.id,`${hit()}, Borealis'in baskısına karşı yanınızdayım; hissedarlara ve basına karşı net bir savunma hattı kuralım.`);
    saveW();
  },8000+Math.random()*6000);
  saveW();
}

/* ---------- kancalar ---------- */
on('time:newDay',()=>pressure(),20);
addFilter('ctxExtra',(s,a)=>(!ensure()||a.id==='gm')?s:s+defenseCtx(a),40);

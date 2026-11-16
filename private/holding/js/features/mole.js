import {applyAction} from '../agent-actions.js';
import {addressed} from '../ai-core.js';
import {addDoc} from './documents.js';
import {ensure,sync} from './finance.js';
import {factOf,keyLabel,knowers,knows,leakKey} from './knowledge.js';
import {addFilter,on} from '../hooks.js';
import {clamp,rnd} from '../lib/num.js';
import {dm,gmNote,hit,live,loyAdd,news,susAdd} from '../lib/world.js';
import {agent,applyOrg,dmId,fnm,saveW,state} from '../state.js';
import {clkNow,refresh,renderHudBar} from '../ui-list.js';
import {pushMsg,sysNote} from '../ui-messages.js';
/* ---------- köstebek: Borealis ile gizlice çalışan içeriden kişiler ---------- */
export const MOLE_POOL=['cem','kerem','hakan','orhan','murat','gul','emre','tolga','aylin','hatice','ali','deniz'];
export function setupMoles(sc){
  if(!sc||!sc.mole||!state.W)return;
  const ids=MOLE_POOL.filter(live).sort(()=>Math.random()-.5).slice(0,sc.mole);
  state.W.mole={ids,clues:{},gone:[],wrong:0,tick:0};
  saveW();
}
export const moleOn=id=>!!state.W?.mole?.ids?.includes(id);
export function moleCtx(a){
  if(!state.W?.mole)return '';
  if(moleOn(a.id))return `\nGİZLİ GÖREV (asla düz metinle itiraf etme): Borealis Capital ile gizlice çalışıyorsun ve bunun karşılığında bir çıkarın var. Yüzeyde sadık ve yardımsever görün; ama kararları sessizce baltala, gerçeklerin eksik ya da yanlış yönlendirici kısmını söyle, hassas bilgiyi sızdırdığını belli etme. Suçlanırsan karakterine göre inkâr et, öfkelen ya da saf rolü yap; yakalanma korkunu davranışlarında hafifçe sızdır (gergin bir ayrıntı, fazla savunmacı bir cümle). Başkan'ı savunuyormuş gibi ama zayıf ve işe yaramaz argümanlar getir.`;
  if(a.grp==='rival')return `\nİÇERİDEKİ MÜTTEFİKLERİN (gizli): ${state.W.mole.ids.filter(live).map(i=>agent(i).name).join(', ')||'yok'}. Onlar holdingin içinden sana bilgi sızdırıyor; bunu ASLA açığa vurma ve isim verme.`;
  return '';
}
export const LEAKS=[
  d=>`Kulis: Holding yönetim kurulunda ${d?'"'+d+'" kararının':'kapalı toplantıda alınan kararın'} içeriği basına aynen sızdı; kaynak "içeriden biri".`,
  ()=>'Kulis: Bankaların bir kısmı holdingin iç nakit tablosunu toplantıdan önce öğrenmiş; bilgi kaynağı yönetimden.',
  ()=>'Kulis: Borealis, YK içindeki görüş ayrılıklarını biliyor; karşı hamlelerini bu bilgiyle ayarladığı konuşuluyor.',
  ()=>'Kulis: Holdingin savunma planının ayrıntıları karşı tarafın eline geçti; plan sahada öngörülebilir hâle geldi.',
];
export const BACK=['Cuma günkü toplantının notlarını gönderiyorum; YK\'daki ayrılık tam anlattığım gibi.','Nakit tablosu ekte; bankaya gitmeden önce bunu bilmeniz işinize yarar.','Savunma planı bu: zehir hapı ve beyaz şövalye; ikisini de hazırlıyorlar.','Beni arama, mesajla yaz; birileri bakıyor gibi.'];
export function moleTick(){
  const M0=state.W.mole;if(!M0||!M0.ids.length||!ensure())return;
  if(Math.random()>.45)return;
  const id=M0.ids[Math.floor(Math.random()*M0.ids.length)];if(!live(id))return;
  const F=state.W.fin,kind0=Math.floor(Math.random()*4),dec=(state.W.dec||[])[0]?.text;
  // bilgi modeli: köstebek yalnızca bildiği bir şeyi sızdırır (hiçbirini bilmiyorsa rastgele türde kalır)
  const kind=[0,1,2,3].map(k=>(kind0+k)%4).find(k=>factOf(id,leakKey(k)))??kind0, lk=leakKey(kind);
  applyAction(factOf(id,lk)?{type:'leak',by:id,key:lk,to:live('selim')?'selim':'basın'}:{type:'leak',by:id,fact:keyLabel(lk),to:live('selim')?'selim':'basın'});
  M0.clues[id]=(M0.clues[id]||0)+1;M0.tick++;
  const sel=state.S.agents.find(x=>x.id==='selim'&&live('selim'))?'selim':null;
  if(sel)pushMsg(dmId(id,sel),{who:id,text:BACK[Math.floor(Math.random()*BACK.length)],t:Date.now()});   // perde arkası
  if(kind===0){news(LEAKS[0](dec&&dec.slice(0,60)));const p=-rnd(.01,.03);F.hisse*=1+p;F.pv*=1+p;sync(p);state.W.hud.itibar.medya='Sızıntı haberleri'}
  else if(kind===1){news(LEAKS[1]());F.faiz=clamp(F.faiz+.3,4,18);sync();dm('aylin',`${hit()}, bankalar yeni borçlanma fiyatını nakit tablomuza bakarak yükseltti; bu bilgi onlara dışarıdan ulaşmış.`)}
  else if(kind===2){news(LEAKS[2]());state.W.pend=[...(state.W.pend||[]),{due:clkNow()+Math.floor(rnd(1,4))*1440,olay:'Borealis, YK içindeki bölünmeyi öne çıkaran bir açıklama yaptı; küçük hissedarlar teklife daha sıcak bakıyor.',nakit:0,hisse_pct:-1.5,sadakat:{}}]}
  else{news(LEAKS[3]());state.W.pend=[...(state.W.pend||[]),{due:clkNow()+Math.floor(rnd(1,3))*1440,olay:'Savunma planı sızdığı için karşı taraf hamlesini önceden yaptı; ek maliyet çıktı.',nakit:-Math.round(rnd(30,90)),hisse_pct:-1,sadakat:{}}]}
  state.W.chron.push('Gizli sızıntı: içeriden biri Borealis\'e bilgi veriyor.');
  // ipucu: iç denetim / BT iz bulur
  if(M0.tick>=2&&Math.random()<.6){
    const strong=M0.clues[id]>=4,who=strong?'berk':'nazli';
    if(live(who)){
      const cand=MOLE_POOL.filter(x=>live(x)&&x!==id&&!M0.ids.includes(x)),kn=cand.filter(x=>knows(x,lk)),pool=kn.length?kn:cand,other=pool[Math.floor(Math.random()*pool.length)]||'cem';   // ikinci şüpheli: sızan bilgiyi bilenlerden
      const txt=strong?`${hit()}, e-posta ve erişim kayıtlarını eşleştirdim; sızıntıların zamanı ${fnm(agent(id).name)} adlı kişinin hareketleriyle birebir örtüşüyor. Kesin demiyorum ama kanıtlar o yönde.`
        :`${hit()}, sızıntıların zamanlamasında iki isim öne çıkıyor: ${[id,other].filter(live).sort(()=>Math.random()-.5).map(x=>fnm(agent(x).name)).join(' ve ')}. Henüz kanıt yok, izlemeye devam ediyorum.`;
      dm(who,txt);addDoc(who,strong?'BT Erişim Kaydı Raporu':'İç Denetim Ön Bulgu Notu',`${txt}\n\nSızan bilgi: ${keyLabel(lk)}. Bu bilgiye erişimi olanlar (${knowers(lk).length}): ${knowers(lk).map(x=>fnm(agent(x).name)).join(', ')||'-'}.\n\nBu not gizlidir. Kişiyi suçlamadan önce kanıtı doğrulamanız önerilir. Komut: /ifşa <isim>`);
    }
  }
  saveW();
}
export function accuse(arg){
  const M0=state.W.mole;
  if(!M0){sysNote('Şu an aktif bir köstebek soruşturması yok.');return}
  const who=addressed(arg,state.S.agents.filter(a=>live(a.id)&&a.grp!=='rival'))[0];
  if(!who){sysNote('Kullanım: /ifşa <isim> (örn. /ifşa Cem)');return}
  const F=state.W.fin;
  if(M0.ids.includes(who.id)){
    M0.ids=M0.ids.filter(x=>x!==who.id);M0.gone.push(who.id);
    state.W.org=state.W.org||{fired:[],mem:{}};if(!state.W.org.fired.includes(who.id))state.W.org.fired.push(who.id);applyOrg();
    news(`${who.name} Borealis ile gizli iş birliği yaptığı gerekçesiyle görevden uzaklaştırıldı.`);
    const p=rnd(.02,.05);F.hisse*=1+p;F.pv*=1+p;sync(p);
    state.W.chron.push(`Köstebek ifşa edildi: ${who.name}.`);
    gmNote(state.current,`🐀 ${fnm(who.name)} köstebek çıktı! Görevden uzaklaştırıldı${M0.ids.length?`; ama içeride hâlâ ${M0.ids.length} kişi var.`:'; içeride başka köstebek kalmadı.'}`);
    if(!M0.ids.length){gmNote('g_genel','✅ Sızıntı durdu: Borealis içerideki kaynaklarını kaybetti.');state.W.hud.krizler=(state.W.hud.krizler||[]).filter(k=>!/sızıntı|içeriden/i.test(k))}
    ['nazli','berk','ece'].forEach(i=>loyAdd(i,3));
  }else{
    M0.wrong++;
    const clue=M0.clues[who.id]||0;
    loyAdd(who.id,-18);susAdd(who.id,8);state.S.agents.forEach(a=>{if(live(a.id)&&a.id!==who.id)loyAdd(a.id,-2)});
    news(`Başkan ${who.name}'i köstebeklikle suçladı; iddia temelsiz çıktı, yönetimde güven sarsıldı.`);
    state.W.chron.push(`Başkan ${who.name}'i haksız yere suçladı.`);
    gmNote(state.current,`⚠️ ${fnm(who.name)} köstebek değilmiş. Yanlış suçlama yönetimde güveni sarstı.`);
    if(M0.wrong>=2&&M0.ids.length){const mm=agent(M0.ids[0]);if(mm)state.W.pend=[...(state.W.pend||[]),{due:clkNow()+1440,olay:'Köstebek fırsatı kullandı: suçlamalar ve iç huzursuzluk basına sızdı, hisse zayıfladı.',nakit:0,hisse_pct:-2.5,sadakat:{}}]}
    dm(who.id,`${hit()}, bu suçlama beni derinden yaraladı; kanıtınız varsa görmek isterim.`);
  }
  saveW();renderHudBar();refresh();
}

export function moleBlock(){
  return `<h3>🐀 Köstebek avı</h3><div class="kv"><span>Durum</span><span>${state.W.mole.ids.length?'İçeride hâlâ köstebek var':'Temizlendi'}</span></div><div class="kv"><span>Yakalananlar</span><span>${state.W.mole.gone.map(i=>fnm(agent(i)?.name)).join(', ')||'-'}</span></div><div class="kv"><span>Yanlış suçlama</span><span>${state.W.mole.wrong}</span></div><div class="mut">İpuçları Nazlı (iç denetim) ve Berk'ten (BT) gelir. Suçlamak için: /ifşa Cem</div>`;
}

/* ---------- kancalar ---------- */
on('gameStarted',({scen})=>setupMoles(scen),20);
on('time:newDay',()=>moleTick(),30);
addFilter('ctxExtra',(s,a)=>(!ensure()||a.id==='gm')?s:s+moleCtx(a),50);
addFilter('panelBlocks',h=>state.W.mole?h+moleBlock():h,30);

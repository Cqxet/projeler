import {applyAction} from '../agent-actions.js';
import {runAgent} from '../ai-core.js';
import {addDoc} from './documents.js';
import {ensure,sync} from './finance.js';
import {ring,ringCur,ringQ} from './ring.js';
import {addFilter,on} from '../hooks.js';
import {day,fx,rnd} from '../lib/num.js';
import {dm,gmNote,hit,live,news} from '../lib/world.js';
import {agent,saveW,state} from '../state.js';
import {clkNow,refresh,renderHudBar} from '../ui-list.js';
import {pushMsg,sysNote} from '../ui-messages.js';
/* ---------- köstebek sensin: Borealis'e gizlice çalışan kullanıcı ---------- */
export const YTASK=['Cuma günkü YK toplantısının notlarını ve kimin ne dediğini bize ilet.','Nakit planını ve banka görüşmelerinin ayrıntılarını paylaş.','Savunma planının (zehir hapı, beyaz şövalye) hazırlık durumunu anlat.','Küçük hissedarların listesini ve hangilerinin satmaya yatkın olduğunu ver.'];
export const YREPLY=['Not aldım. Bu bilgi bize çok işe yarayacak; hesabına ek bir ödeme yapıldı.','Güzel. Hamlemizi buna göre ayarlayacağız. Kimseyle konuşma, hat temiz kalsın.','Teşekkürler. Bir adım daha yaklaştık; seni unutmayacağız.','Tam zamanında geldi. Ödemen yolda, dikkatli ol.'];
export function youLevel(){const s=state.W.you.sus;return s<20?'Düşük':s<45?'Orta':s<70?'Yüksek':'Kritik'}
export function setupYou(sc){
  if(!sc||!sc.youMole||!state.W)return;
  state.W.you={sus:5,prog:10,paid:0,leaks:0,last:day(clkNow()),caught:false,won:false,taskDay:day(clkNow())};
  state.W.chron.push('Gizli: Başkan\'ın ekibinden biri Borealis ile temasta.');
  setTimeout(()=>{if(!state.W||!state.W.you)return;
    pushMsg('selim',{who:'selim',text:'Hoş geldin. Bu hat sadece bizim; başka kimseye gösterme. İlk bilgiyi göndermen yeter: /sızdır <ne öğrendin> yazman yeterli.',t:Date.now()});
    gmNote(state.current,'🕶️ Sen Borealis\'in içerideki adamısın. Komutlar: /sızdır <bilgi> · /rapor. Şüphe ve ilerleme panelde (💰 → Gizli hat). İç denetim ve BT iz sürüyor.');
    saveW();
  },400);
  saveW();
}
export function youLeak(text,mult=1){
  const Y=state.W.you,F=state.W.fin;if(!Y||Y.caught||Y.won)return;
  const d=day(clkNow());Y.last=d;Y.leaks++;
  const prog=Math.round(rnd(6,10)*mult),pay=Math.round(rnd(6,14)*mult*10)/10,sus=Math.round(rnd(7,13)*mult);
  Y.prog=Math.min(100,Y.prog+prog);Y.sus=Math.min(100,Y.sus+sus);Y.paid=Math.round((Y.paid+pay)*10)/10;
  const p=-rnd(.008,.025)*mult;F.hisse*=1+p;F.pv*=1+p;sync(p);
  state.W.pend=[...(state.W.pend||[]),{due:clkNow()+Math.floor(rnd(1,4))*1440,olay:'Borealis, içeriden gelen bilgiyle hamlesini ayarladı; holdingin savunması zorlaştı.',nakit:-Math.round(rnd(10,40)*mult),hisse_pct:-rnd(.5,1.5),sadakat:{}}];
  if(Math.random()<.5)news(`Kulis: Holdingin iç planı ${text?'("'+String(text).slice(0,50)+'") ':''}karşı tarafın eline geçmiş görünüyor; sızıntının kaynağı araştırılıyor.`);
  state.W.chron.push('Gizli sızıntı yapıldı.');
  applyAction({type:'leak',by:'user',fact:text||'(ayrıntı vermedi)',to:live('selim')?'selim':'basın'});
  const rep=YREPLY[Math.floor(Math.random()*YREPLY.length)];
  if(state.S.model&&live('selim'))runAgent(agent('selim'),'selim',`Başkan'ın ekibindeki gizli köstebek az önce sana şu bilgiyi verdi: "${text||'(ayrıntı vermedi)'}". Ona kısa, soğuk ve profesyonelce teşekkür et, ödemeyi/ilerlemeyi ima et ve dikkatli olmasını söyle. En fazla 2 cümle.`,99,true);
  else pushMsg('selim',{who:'selim',text:rep,t:Date.now()});
  gmNote(state.current,`🕶️ Bilgi gitti (+${pay} M₺ kişisel kazanç). Borealis ilerlemesi %${Y.prog}, şüphe: ${youLevel()}.`);
  if(Y.prog>=100)youWin();
  saveW();renderHudBar();refresh();
}
export function youWin(){
  const Y=state.W.you;if(Y.won||Y.caught)return;Y.won=true;
  news('Borealis Capital, holdingde kontrolü ele geçirdi; yönetim kurulu yeniden yapılandırıldı.');
  ring({who:'selim',kind:'invite',title:'Devralma tamamlandı',ok:'Kabul et',no:'Kabul et',text:`Kontrol bizde. Sözümüzü tutuyoruz: ${fx(Y.paid)} M₺ kişisel ödemeni aldın ve Borealis'te sana yönetici ortaklık pozisyonu hazır. İyi iş çıkardın.`,onAnswer:()=>{gmNote(state.current,'🏁 OYUN SONU — Köstebek başarıyla görevi tamamladı. Yeni oyun için ⚙️ menüsünden senaryo seç.');saveW()}});
}
export function youCaught(why){
  const Y=state.W.you;if(!Y||Y.caught||Y.won)return;Y.caught=true;
  news('İç soruşturma tamamlandı: Borealis\'e bilgi sızdıran yönetici ortaya çıktı ve görevinden alındı.');
  state.W.chron.push('Köstebek (kullanıcı) yakalandı.');
  ring({who:live('nazli')?'nazli':'zeynep',kind:'invite',title:'Soruşturma sonucu',ok:'Kabul et',no:'İtiraf et',text:`${why} Bilgisayar, e-posta ve toplantı kayıtları seni gösteriyor. Görevinle ilişiğin kesildi.`,onAnswer:()=>{gmNote(state.current,'🏁 OYUN SONU — Yakalandın, kariyerin bitti. Yeni oyun için ⚙️ menüsünden senaryo seç.');saveW()}});
  saveW();
}
export function youTick(){
  const Y=state.W.you;if(!Y||Y.caught||Y.won||!ensure())return;
  const d=day(clkNow());
  if(d-Y.last>=3)Y.sus=Math.max(0,Y.sus-2);
  if(Y.sus>=35&&!Y.s1&&live('nazli')){Y.s1=1;dm('nazli',`${hit()}, sızıntıların zamanlamasında yönetimden birine ait izler görüyorum; henüz isim yok ama daraltıyorum.`)}
  if(Y.sus>=60&&!Y.s2&&live('berk')){Y.s2=1;dm('berk',`${hit()}, erişim kayıtlarında şüpheli bir örüntü var; yönetim katından biri dışarıyla gizli iletişim kuruyor olabilir.`);addDoc('berk','BT Erişim Kaydı Raporu','Gizli: Yönetim katından kaynaklanan, mesai dışı ve şifreli dış iletişim örüntüsü tespit edilmiştir. Kişi tespiti için ek log analizi sürmektedir.\n\nBerk Polat, BT & Siber Güvenlik')}
  if(Y.sus>=78&&!Y.s3&&!ringCur&&!ringQ.length){Y.s3=1;
    ring({who:live('faruk')?'faruk':'murat',kind:'invite',title:'Savunma toplantısı',ok:'Katıl',no:'Gitme',text:'Soruşturma ekibi seninle bir görüşme istiyor. Sızıntılarla ilgili bazı kayıtlar önünde; açıklaman gerekiyor.',
      onAnswer:ok=>{if(ok&&Math.random()<.5){Y.sus=Math.max(0,Y.sus-22);gmNote(state.current,'😮‍💨 Görüşmeyi atlattın; şüphe biraz dağıldı.')}else{Y.sus=Math.min(100,Y.sus+(ok?12:20));gmNote(state.current,ok?'⚠️ Yanıtların tutarsız bulundu; şüphe arttı.':'⚠️ Gitmemen şüpheyi artırdı.')}saveW()}})}
  if(Y.sus>=100)youCaught('Soruşturma kesinleşti.');
  // Borealis görevi
  if(d-Y.taskDay>=4&&!ringCur&&!ringQ.length&&live('selim')){Y.taskDay=d;
    const t=YTASK[Math.floor(Math.random()*YTASK.length)];
    ring({who:'selim',kind:'invite',title:'Borealis görevi',ok:'Yap',no:'Reddet',text:t,onAnswer:ok=>{
      if(ok)youLeak(t.slice(0,60),1.4);
      else{Y.sus=Math.min(100,Y.sus+3);dm('selim','Kayıtlar elimizde, unutma. Bir sonraki sefer reddetme.');state.W.chron.push('Borealis görevi reddedildi.');saveW()}
    }});
  }
  saveW();
}
export function youCmd(cmd,arg){
  const Y=state.W.you;
  if(!Y){sysNote('Bu komut sadece "Köstebek Sensin" senaryosunda çalışır.');return}
  if(Y.caught||Y.won){sysNote('Oyun bitti. Yeni oyun için ⚙️ menüsünden senaryo seç.');return}
  if(cmd==='rapor'){sysNote(`🕶️ Borealis ilerlemesi %${Y.prog} · şüphe: ${youLevel()} (${Y.sus}) · kişisel kazanç ${fx(Y.paid,1)} M₺ · sızıntı ${Y.leaks}`);return}
  youLeak(arg,1);
}
export const youBlock=()=>{const Y=state.W.you;return Y?`<h3>🕶️ Gizli hat (Borealis)</h3><div class="kv"><span>Devralma ilerlemesi</span><span>%${Y.prog}</span></div><div class="kv"><span>Şüphe düzeyi</span><span>${youLevel()} (${Y.sus})</span></div><div class="kv"><span>Kişisel kazanç</span><span>${fx(Y.paid,1)} M₺</span></div><div class="kv"><span>Sızıntı sayısı</span><span>${Y.leaks}</span></div><div class="mut">${Y.caught?'Yakalandın.':Y.won?'Devralma tamamlandı.':'Komut: /sızdır <bilgi> · /rapor. Sızdırdıkça şüphe artar; birkaç gün sakin durursan düşer.'}</div>`:''};
export function youCtx(a){
  const Y=state.W?.you;if(!Y)return '';
  if(a.id==='nazli'&&Y.sus>=35)return `\nSORUŞTURMA: Sızıntıların kaynağını arıyorsun; kullanıcıdan hafif şüphelenmeye başladın (şüphe düzeyi: ${youLevel()}). Kesin suçlama yapma ama soru sor, iz sürdüğünü hissettir.`;
  if(a.id==='berk'&&Y.sus>=45)return `\nSORUŞTURMA: Erişim kayıtlarında şüpheli bir iz buldun ve bunun kullanıcıya yaklaştığını fark ediyorsun; temkinli ama kararlı konuş.`;
  if(a.grp==='rival'&&a.id==='selim')return `\nKÖSTEBEĞİN: Kullanıcı Borealis adına içeriden çalışıyor. Onunla soğuk ve ticari konuş; sızdırdıkça ödeme ve konum sözü ver, yakalanırsa ondan uzaklaşacağını ima et. Ajan olmadığını başkalarına asla söyleme.`;
  if(Y.sus>=65&&a.grp!=='rival')return `\nSOĞUKLUK: Yönetimde senin hakkında kuşku var; kullanıcıya karşı mesafelisin ve sorgularsın.`;
  return '';
}

/* ---------- kancalar ---------- */
on('gameStarted',({scen})=>setupYou(scen),30);
on('time:newDay',()=>youTick(),40);
addFilter('ctxExtra',(s,a)=>(!ensure()||a.id==='gm')?s:s+youCtx(a),60);
addFilter('panelBlocks',h=>state.W.you?h+youBlock():h,20);

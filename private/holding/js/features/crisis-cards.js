import {recordDec} from './decisions.js';
import {sync} from './finance.js';
import {ring,ringCur,ringQ} from './ring.js';
import {gmTick} from '../gm.js';
import {on} from '../hooks.js';
import {notify} from '../lib/notify.js';
import {clamp,day} from '../lib/num.js';
import {gmNote,live,loyAdd,news,susAdd} from '../lib/world.js';
import {agent,saveW,state} from '../state.js';
import {clkNow,refresh,renderHudBar} from '../ui-list.js';
/* ---------- kriz kartları: 2-3 seçenekli kararlar ---------- */
export const CRISIS_CARDS=[
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
export function applyFx(fx0,optText,c){
  const F=state.W.fin;
  if(fx0.nakit)F.nakit+=fx0.nakit;
  if(fx0.faiz)F.faiz=clamp(F.faiz+fx0.faiz,4,18);
  if(fx0.hisse){const pc=fx0.hisse/100;F.hisse*=1+pc;F.pv*=1+pc;sync(pc)}else sync();
  for(const id in (fx0.loy||{}))loyAdd(id,fx0.loy[id]);
  for(const id in (fx0.sus||{}))susAdd(id,fx0.sus[id]);
  if(fx0.itibar)Object.assign(state.W.hud.itibar,fx0.itibar);
  if(fx0.krizAdd&&!state.W.hud.krizler.includes(fx0.krizAdd))state.W.hud.krizler.push(fx0.krizAdd);
  if(fx0.news)news(fx0.news);
  state.W.chron.push(`Kriz: ${c.title} — karar: ${optText}`);state.W.chron=state.W.chron.slice(-25);
  recordDec(`${c.title}: ${optText}`,true);
  saveW();renderHudBar();refresh();
  if(state.S.model&&state.S.autoHud)gmTick(`Kriz kararı verildi (${c.title}): ${optText}. Panel durumunu tutarlı biçimde güncelle.`);
}
export function crisisCard(){
  if(ringCur||ringQ.length)return false;
  const F=state.W.fin,last=state.W.crisisLast??-99,d=day(clkNow());
  if(d-last<10)return false;
  const pool=CRISIS_CARDS.filter(c=>live(c.who)&&c.id!==state.W.crisisPrev);
  if(!pool.length)return false;
  const c=pool[Math.floor(Math.random()*pool.length)];
  state.W.crisisLast=d;state.W.crisisPrev=c.id;
  ring({who:c.who,kind:'scene',title:'🚨 '+c.title,text:c.text,opts:c.opts.map(o=>o.t),def:c.opts.length-1,
    onAnswer:i=>{const o=c.opts[Math.max(0,Math.min(c.opts.length-1,i))];
      gmNote(state.current,`🚨 ${c.title}: "${o.t}" kararını verdin.`);applyFx(o.fx,o.t,c)}});
  notify(agent(c.who).name,'🚨 '+c.title,c.who);
  return true;
}

/* ---------- kancalar ---------- */
on('time:newDay',()=>{if(!state.W.calm&&!state.W.ended&&Math.random()<.14)crisisCard()},60);

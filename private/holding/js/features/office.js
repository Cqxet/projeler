import {enterRoom,presentOf,runAgent} from '../ai-core.js';
import {ring,ringCur,ringQ} from './ring.js';
import {on} from '../hooks.js';
import {day} from '../lib/num.js';
import {dm,gmNote,hit,live,loyAdd} from '../lib/world.js';
import {agent,fnm,saveW,state} from '../state.js';
import {openChat} from '../ui-list.js';
import {pushMsg} from '../ui-messages.js';
/* ---------- ofis: kapı çalma ---------- */
export const KNOCK=[
  {who:'zeynep',text:'Kapıyı çalıyorum; imzanızı bekleyen birkaç evrak var, bir dakikanızı alabilir miyim?',hint:'Ofisin kapısını çalıp içeri girdin; imza bekleyen evrakları ve günün programını kısaca hatırlat. En fazla 2 cümle.'},
  {who:'aylin',text:'Müsaitseniz iki dakikalığına girmek istiyorum; nakit tablosunda konuşmamız gereken bir şey var.',hint:'Ofise girdin; nakit/borç tablosunda dikkatini çeken bir noktayı net söyle. En fazla 2 cümle.'},
  {who:'murat',text:'Kapınızın önünden geçiyordum, içeri bir uğrayayım dedim; iki çift lafımız var.',hint:'Ofise rahat bir tavırla girdin; çıkarını belli etmeden gündemi yoklayan kısa bir laf aç. En fazla 2 cümle.'},
  {who:'kerem',text:'Birkaç dakikanız var mı? Babamla ilgili ve şirketle ilgili konuşmak istediğim bir şey var.',hint:'Ofise girdin; temkinli ama duygusal biçimde aile/şirket kaygını dile getir. En fazla 2 cümle.'},
  {who:'ece',text:'Kapınızı çalabilir miyim? Basında konuşulan bir şey var, önceden haberiniz olsun istedim.',hint:'Ofise girdin; basındaki bir gelişmeyi (kulis, soru, haber) kısa ve net aktar. En fazla 2 cümle.'},
  {who:'hakan',text:'Telefonda anlatmak istemedim; kısa bir ziyaret yapabilir miyim?',hint:'Ofise girdin; Ankara/kamu tarafından gelen bir işareti ima dolu biçimde ilet. En fazla 2 cümle.'},
  {who:'fatma',text:'Çay getirdim yavrum, kapıdayım. İçeri gireyim mi?',hint:'Çayla ofise girdin; sıcak bir ikramla birlikte binadan duyduğun küçük bir şeyi sade bir dille anlat. En fazla 2 cümle.'},
];
export function maybeKnock(o,n){
  const F=state.W.fin;
  for(let d=Math.max(day(o),day(n)-3);d<=day(n);d++)for(const m of [660,930]){
    const t=d*1440+m;if(!(t>o&&t<=n)||ringCur||ringQ.length)continue;
    if(d-(F.knockDay??-9)<1&&m===930||Math.random()>.28)continue;
    const pool=KNOCK.filter(k=>live(k.who)&&!presentOf('g_ofis').includes(k.who)&&(k.who!=='kerem'||state.W.calm!==true||Math.random()<.4));
    if(!pool.length)continue;
    const k=pool[Math.floor(Math.random()*pool.length)];F.knockDay=d;
    ring({who:k.who,kind:'invite',title:'Kapı çalındı',ok:'İçeri al',no:'Sonra gelsin',text:k.text,loy:[2,-2],
      onAnswer:ok=>{
        if(!ok){loyAdd(k.who,-1);dm(k.who,`${hit()}, anlaşıldı; müsait olunca haber verirsiniz.`);saveW();return}
        enterRoom('g_ofis',[k.who],true);gmNote('g_ofis',`🚪 ${fnm(agent(k.who).name)} kapıyı çalıp içeri girdi.`);openChat('g_ofis');loyAdd(k.who,2);
        if(state.S.model)runAgent(agent(k.who),'g_ofis',k.hint,99,true);else pushMsg('g_ofis',{who:k.who,text:k.text,t:Date.now()});
        saveW();
      }});
  }
}

/* ---------- kancalar ---------- */
on('time:advance',({from,to})=>maybeKnock(from,to),50);

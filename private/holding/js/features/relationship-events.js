import {runAgent} from '../ai-core.js';
import {loveLvl,partnerId} from '../backstage.js';
import {meRole} from '../data.js';
import {addDoc} from './documents.js';
import {ring,ringCur,ringQ} from './ring.js';
import {on} from '../hooks.js';
import {day} from '../lib/num.js';
import {dm,hit,live,loyAdd,news,susAdd} from '../lib/world.js';
import {agent,fnm,saveW,state} from '../state.js';
import {clkHM,openChat,renderHudBar} from '../ui-list.js';
import {pushMsg} from '../ui-messages.js';
/* ---------- ilişki: baş başa akşamlar, dedikodu, çıkar çatışması (açık cinsellik yok; ima ve sahne geçişi) ---------- */
export function partnerEvents(o,n){
  const pid=partnerId();if(!pid||!live(pid))return;
  const F=state.W.fin,lv=state.W.love[pid],a=agent(pid),me=state.W.meN||meRole().short,y=lv.yak??10;
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
        state.W.chron.push(`Başkan ${fnm(a.name)} ile baş başa bir akşam geçirdi.`);
        pushMsg(pid,{who:'gm',act:true,text:`🌙 ${fnm(a.name)} ile baş başa bir akşam geçirdiniz (${clkHM()}).`,t:Date.now()});
        openChat(pid);
        if(state.S.model)runAgent(a,pid,`Başkan'la ${place} akşamındasın; ilişkinizin düzeyi: ${loveLvl(pid)}. Bu anın sıcaklığını, çekimi ve aranızdaki gerilimi yetişkinlere yakışır bir dille, açık cinsel betimleme olmadan (ima ve sahne geçişiyle) yansıt; en fazla 3 cümle, klişe yok.`,99,true);
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
    state.W.hud.itibar.medya='Kulis: yönetimde ilişki dedikodusu';
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

/* ---------- kancalar ---------- */
on('time:newDay',({from,to})=>partnerEvents(from,to),10);

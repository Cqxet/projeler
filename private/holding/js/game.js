import {presentOf,runAgent} from './ai-core.js';
import {backstage,crushOut,partnerId} from './backstage.js';
import {CRISES,GROUPS,ROLES,baseHud} from './data.js';
import {gmTick} from './gm.js';
import {emit} from './hooks.js';
import {$} from './lib/util.js';
import {openCfg} from './settings.js';
import {agent,applyOrg,baseMem,ctrls,fired,saveM,saveW,snaps,state} from './state.js';
import {say,stopSpeech} from './tts.js';
import {clkNow,openChat,renderHudBar,setClk} from './ui-list.js';
import {pushMsg,sysNote} from './ui-messages.js';
import {snap} from './undo.js';
/* ================= Oyun başlat / kriz / yeni tur ================= */
export function startGame(sc,custom){
  const rl=ROLES.find(r=>r.id===($('rolsel')?.value||'baskan'))||ROLES[0];
  state.epoch++; snaps.length=0;
  stopSpeech();ctrls.forEach(c=>c.abort());
  const hud=baseHud(); let brief,open;
  if(sc){sc.patch(hud);brief=sc.brief;open=sc.open}
  else{brief='Serbest kurulum. Soylu Holding A.Ş. (demir-çelik, perakende, enerji-liman) yönetim kurulu başkanı sensin. Kullanıcının tarifi: '+custom;open='Senaryonuz kuruldu. Maslak\'taki genel merkezde herkes toplantı odasında bekliyor. Başkanım, ilk hamleniz?'}
  state.W={scen:sc?.id||'custom',calm:!!sc?.calm,brief,hud,chron:[sc?sc.title+' senaryosu başladı.':'Özel senaryo başladı.'],tickT:Date.now(),me:rl.id,meN:($('namesel')?.value||'').trim().slice(0,30),meG:($('gensel')?.value==='f'?'f':'m'),clk:540+Math.floor(Math.random()*90),org:{fired:[],mem:{}}};
  if(rl.id!=='baskan'){   // gerçek YK Başkanı artık bir ajan
    open=open.replace(/[^.!?]*Başkanım[^.!?]*[.!?]?\s*$/,'').trim()+` Sen ${rl.title} olarak buradasın; Yönetim Kurulu Başkanı Faruk Soylu da yönetimin başında. Ne yapıyorsun?`;
    state.W.org.hired=[{id:'faruk',hired:true,name:'Faruk Soylu',role:'Yönetim Kurulu Başkanı',color:'#e0c36a',g:'m',pitch:0.75,rate:0.92,
      prompt:'Sen Faruk Soylu\'sun, Soylu Holding Yönetim Kurulu Başkanı ve Rıza Soylu\'nun büyük oğlusun. Soğukkanlı, otoriter ve hesaplı konuşursun; kararları sen verirsin, astlarından net sonuç beklersin. Kerem\'in ağabeyisin ve ona karşı hem koruyucu hem tedirginsin.',
      secret:'Koltuğunu korumak için kimseye tam güvenmezsin; herkesin sadakatini yoklarsın.'}];
    ['g_yk','g_genel','g_exco'].forEach(g=>state.W.org.mem[g]=[...baseMem(g),'faruk']); state.W.loy={faruk:70};
  }
  if(sc?.rivals){   // karşı taraf kişileri: solda ayrı bölümde, holding grup sohbetlerine girmez
    state.W.org.hired=[...(state.W.org.hired||[]),...sc.rivals.map(r=>({...r,hired:true,grp:'rival'}))];
    state.W.loy={...(state.W.loy||{})};sc.rivals.forEach(r=>state.W.loy[r.id]=15);
  }
  applyOrg(); state.M={};state.unread={};state.typing={};saveW();saveM();
  $('ng').classList.remove('open');
  // oyun toplantı odasında başlar: herkes orada; toplantı bitince (ya da sen çıkarınca) odadan ayrılırlar
  state.W.present={g_toplanti:[...GROUPS.find(g=>g.id==='g_genel').members],g_genel:[],g_ofis:[]};
  state.current='g_toplanti';
  pushMsg('g_toplanti',{who:'gm',text:open,t:Date.now()});
  say(agent('gm'),open);
  renderHudBar();openChat('g_toplanti');
  if(!state.S.model){sysNote('Başlamak için ⚙ Ayarlar\'dan 9Router adresi ve modeli gir.');}
  emit('gameStarted',{scen:sc,custom});
}
export function triggerCrisis(){
  if(!state.W)return; snap('Kriz'); const text=CRISES[Math.floor(Math.random()*CRISES.length)];
  $('pnl').classList.remove('open'); openChat('g_genel');
  pushMsg('g_genel',{who:'gm',text:'🚨 '+text,t:Date.now()}); pushMsg('ch_haber',{who:'gm',text:'📰 '+text,t:Date.now()});
  state.W.hud.krizler=[...state.W.hud.krizler,text.slice(0,110)];state.W.chron.push(text);state.W.backDue='Yeni kriz: '+text;saveW();renderHudBar();
  stopSpeech(); say(agent('gm'),text);
  if(state.S.model){presentOf('g_genel').map(agent).filter(a=>a&&a.id!=='gm').forEach(a=>runAgent(a,'g_genel'));gmTick('Yeni kriz çıktı: '+text)}
}
export function nextTurn(){
  emit('beforeNextTurn');
  try{nextTurnBase()}finally{emit('afterNextTurn')}
}
export function nextTurnBase(){
  if(!state.W)return; if(!state.S.model){openCfg();return}
  snap('Yeni çeyrek');
  $('pnl').classList.remove('open'); openChat('g_genel'); stopSpeech();
  {const d=Math.floor(clkNow()/1440); setClk((d+(7-d%7))*1440+540+Math.floor(Math.random()*30))}   // sonraki pazartesi sabahı
  state.W.backDue='Yeni çeyrek başladı'; saveW();
  { // çeyrek atlayınca ilişkiler de ilerler (perde arkası), sevgilin varsa o da bir gelişme yaşatır
    const ev='Yeni çeyrek başladı: aylar geçti.'; const pid=partnerId(), epq=state.epoch;
    backstage('Bir çeyrek (3 ay) geçti. Mevcut ilişkileri BELİRGİN biçimde ilerlet: yeni flört, yakınlaşma, kıskançlık, kırgınlık, ayrılık, nişan/evlilik gibi gelişmeler; ikili yazışmalar ve gruplar kur, ilişki güncellemeleri yap.');
    if(pid&&state.S.model)setTimeout(()=>{if(epq===state.epoch&&!fired(pid)&&partnerId()===pid)runAgent(agent(pid),pid,`Aylar geçti ve Başkan'la ilişkiniz bu sürede bir yere evrildi. Karakterine göre ilişkinizdeki bir gelişmeyi (yakınlaşma, özlem, küçük bir kırgınlık, gelecek planı ya da ciddi bir konuşma isteği) Başkan'a özelden aç; en fazla 3 cümle, cinsel içerik yok.`,99,true)},6000);
    else if(state.S.model)crushOut('Yeni çeyrek',false);
  }
  const gm=agent('gm');
  runAgent(gm,'g_genel',state.W.calm?'Yeni çeyrek başladı. Sakin geçen dönemi 3 cümleyle özetle (rutin gelişmeler, rakamlar) ve Başkan\'ın önüne 2 rutin gündem maddesi koy. Kriz veya entrika uydurma.':'Yeni çeyrek başladı. Piyasadaki ve holdingdeki gelişmeleri 3 cümleyle özetle (kur/faiz, bankalar, rakipler, aile/YK, Ankara) ve Başkan\'ın önüne 2 acil konu koy.');
  gmTick('Yeni çeyreğe geçildi: zamanı ilerlet, tarih alanını güncelle, piyasada ve holdingde gelişmeler olsun.');
}

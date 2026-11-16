import {enterRoom,runAgent} from './ai-core.js';
import {isBoss} from './data.js';
import {$,esc} from './lib/util.js';
import {agent,chatName,fired,isGroup,saveW,state} from './state.js';
import {pushMsg} from './ui-messages.js';
/* ================= Eylemler: çay getirmek, belge çıkarmak... (gecikmeli teslim) ================= */
export const EYLEM='EYLEM KURALI: Başkan senden fiziksel veya ofis işi isterse (çay/kahve getirmek, belge çıkarmak, araç hazırlamak, birini çağırmak, dosya getirmek, ekran kurmak vb.) ve bu rolüne uygunsa, kısa bir cevap yaz ve mesajının EN SONUNA şu etiketi ekle: [EYLEM: saniye | ne yapıyorsun | oda]. Saniye 15-90 arası gerçekçi olsun (çay 30, belge 60, araç 90). Üçüncü alan: sonuç Başkan\'ın bulunduğu odaya fiziksel gelecekse "oda", sonucu sana özelden bildireceksen "özel". Etiketi Başkan görmez. İşi henüz yapmadın: "hemen getiriyorum" gibi söyle, bitmiş gibi anlatma. Rolünün dışındaki işleri kabul etme, etiket ekleme.';
export const taskTimers=new Map();
export function scheduleTask(a,sn,desc,yer,origin){
  if(!state.W)return;
  sn=Math.min(180,Math.max(8,parseInt(sn)||30));
  const mt=/çağır|çağrıl|odam|odaya geç|görüş|toplantı|konuş|danış|rapor ver|sun(um|uş)|brifing|geliyor|gelsin|buluş/i.test(desc), dr=/çay|kahve|su\b|içecek|ikram|bırak|teslim|dağıt|getir/i.test(desc)&&!mt;
  // odaya fiziksel gelme sadece Başkan'ın çağrı/teslimat işlerinde; diğer her şey (yolculuk, imza, telefon...) özelden bildirilir, grup odası boş kalır
  const priv=/özel|ozel|private/i.test(yer||'')||!isBoss()||!(mt||dr);
  if(!priv&&isGroup(origin))state.W.room=origin;
  const t={id:'t'+Date.now()+Math.random().toString(36).slice(2,6),agent:a.id,desc:desc.trim(),priv,origin,due:Date.now()+sn*1000};
  (state.W.tasks||(state.W.tasks=[])).push(t); saveW(); armTask(t); renderTasks();
}
export function armTask(t){clearTimeout(taskTimers.get(t.id));taskTimers.set(t.id,setTimeout(()=>runTask(t.id),Math.max(0,t.due-Date.now())))}
export function runTask(id){
  const i=(state.W?.tasks||[]).findIndex(t=>t.id===id); if(i<0)return;
  const t=state.W.tasks.splice(i,1)[0]; saveW(); renderTasks(); taskTimers.delete(id);
  const a=agent(t.agent); if(!a||!state.S.model||fired(a.id))return;
  const target=t.priv?a.id:(state.W.room||(isGroup(t.origin)?t.origin:'g_genel'));
  if(!t.priv){pushMsg(target,{who:'gm',act:true,text:`🚪 ${a.name} odaya geldi: ${t.desc}`,t:Date.now()});enterRoom(target,[a.id],true)}
  // Sadece saf teslimatta (çay, evrak bırakma) hemen çıkılır; çağrılma/görüşme/toplantı ise kişi odada kalır
  const meet=/çağır|çağrıl|odam|odaya geç|görüş|toplantı|konuş|danış|rapor ver|sun(um|uş)|brifing|geliyor|gelsin|buluş/i.test(t.desc), drop=/çay|kahve|su\b|içecek|ikram|bırak|teslim|dağıt|getir/i.test(t.desc)&&!meet;
  runAgent(a,target,t.priv
    ?`"${t.desc}" işini tamamladın. Sonucu Başkan'a özelden kısa bildir.`
    :drop
      ?`"${t.desc}" işini tamamladın ve şu an ${chatName(target)} odasındasın. Teslim ederken söyleyeceğin kısa, doğal bir cümle yaz ve mesajının sonuna [AYRIL] ekle.`
      :`Başkan seni çağırdığı için ("${t.desc}") ${chatName(target)} odasına geldin. Kısaca geldiğini bildir ve Başkan'ı dinlemeye hazır ol; Başkan seni göndermedikçe odada KALIRSIN, [AYRIL] ekleme, evrak bırakıp çıkıyormuş gibi davranma.`,0,true);
}
export function renderTasks(){
  const tb=$('taskbar'), ts=state.W?.tasks||[]; tb.style.display=ts.length?'block':'none';
  tb.innerHTML=ts.map(t=>`⏳ ${esc(agent(t.agent)?.name||'')} · ${esc(t.desc)} · ${Math.max(0,Math.ceil((t.due-Date.now())/1000))} sn`).join('<br>');
}
export function initActions(){setInterval(()=>{if(state.W?.tasks?.length)renderTasks()},1000)}

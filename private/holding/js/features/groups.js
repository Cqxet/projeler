import {enterRoom,runAgent} from '../ai-core.js';
import {GROUPS,isBoss,loyOf} from '../data.js';
import {consequences} from './decisions.js';
import {ring,ringCur,ringQ} from './ring.js';
import {on} from '../hooks.js';
import {day} from '../lib/num.js';
import {dm,gmNote,hit,live,loyAdd,news} from '../lib/world.js';
import {agent,applyOrg,fnm,group,saveM,saveW,state} from '../state.js';
import {clkNow,openChat} from '../ui-list.js';
import {pushMsg} from '../ui-messages.js';
/* ---------- muhalefet, davetler ve kullanıcının dahil olduğu gruplar ---------- */
// Muhalif: Başkan'san YK'da azınlıktasın; diğer rollerde üst yönetimin sana sadakati düşüktür.
export function isOpp(){
  if(isBoss())return state.W.hud.yk.muhalif>state.W.hud.yk.sen;
  const ids=['murat','aylin','sevgi','kerem','faruk'].filter(live);
  return ids.length>0&&ids.reduce((s,i)=>s+loyOf(i),0)/ids.length<40;
}
// W.xgroups: kullanıcının üyesi olduğu dinamik gruplar; GROUPS dizisine eşitlenir (geri alma/yükleme sonrası da)
export function syncGroups(){
  const want=state.W?.xgroups||[];
  for(let i=GROUPS.length-1;i>=0;i--)if(GROUPS[i].x&&!want.some(x=>x.id===GROUPS[i].id))GROUPS.splice(i,1);
  want.forEach(x=>{
    if(!GROUPS.some(g=>g.id===x.id))GROUPS.push({id:x.id,ico:x.ico,name:x.name,members:[...x.members],x:true});
    state.W.org=state.W.org||{fired:[],mem:{}};state.W.org.mem=state.W.org.mem||{};
    if(!state.W.org.mem[x.id])state.W.org.mem[x.id]=[...x.members];
  });
}
on('beforeApplyOrg',()=>syncGroups());
export function createUserGroup(name,ico,members,tur){
  const id='g_x'+Date.now().toString(36).slice(-5)+Math.floor(Math.random()*9);
  (state.W.xgroups||(state.W.xgroups=[])).push({id,ico,name,members:members.filter(live),tur});
  syncGroups();applyOrg();
  state.W.present=state.W.present||{};state.W.present[id]=[...(state.W.org.mem[id]||[])];
  return id;
}
export function removeUserGroup(id,why){
  const x=(state.W.xgroups||[]).find(g=>g.id===id);if(!x)return;
  state.W.xgroups=state.W.xgroups.filter(g=>g.id!==id);delete state.W.org.mem[id];delete state.M[id];
  syncGroups();applyOrg();if(state.current===id)openChat('g_genel');
  gmNote('g_genel',`🚫 "${x.name}" grubundan çıkarıldın: ${why}`);
}
export function ykEvent(log){
  if(!isBoss()){gmNote('g_yk','📅 Haftalık YK toplantısı vakti.');return}
  const ex=state.W.excl||(state.W.excl=[]);
  if(isOpp()){
    state.W.oppStrikes=(state.W.oppStrikes||0)+1;
    news('Yönetim Kurulu muhalif üyelerin çağrısıyla toplandı; Başkan davet edilmedi.');
    dm('zeynep',`${hit()}, YK bugün toplanmış ama size davet gelmedi; kulislere göre muhalifler kendi aralarında karar almış.`);
    if(state.W.oppStrikes>=2&&!ex.includes('g_yk')){ex.push('g_yk');if(state.current==='g_yk')openChat('g_genel');gmNote('g_genel','🚫 Muhalif kanat YK yazışmalarını sana kapattı; artık YK grubunda değilsin.')}
    if(state.W.oppStrikes>=4&&!ex.includes('g_exco')){ex.push('g_exco');if(state.current==='g_exco')openChat('g_genel');gmNote('g_genel','🚫 İcra Kurulu da seni dışarıda bıraktı; artık İcra grubunda değilsin.')}
    state.W.backDue='Muhalifler Başkan olmadan YK topladı';log.push('YK Başkan\'sız toplandı');
    consequences('Muhalif YK üyeleri Başkan davet edilmeden toplanıp kendi kanatlarının lehine bir karar aldı');
  }else{
    if(ex.length||state.W.oppStrikes){state.W.excl=[];state.W.oppStrikes=0;gmNote('g_genel','✅ Çoğunluğu geri kazandın; YK ve İcra Kurulu yazışmaları yeniden açıldı.')}
    gmNote('g_yk','📅 Haftalık YK toplantısı vakti.');
    ring({who:'zeynep',kind:'invite',title:'YK toplantısı daveti',ok:'Katıl',no:'Bu hafta gelmem',
      text:`${hit()}, haftalık YK toplantısı başlıyor; salonda herkes sizi bekliyor.`,
      onAnswer:ok=>{
        if(!ok){loyAdd('murat',-2);loyAdd('kerem',2);gmNote('g_yk','📅 Başkan bu haftaki toplantıya katılmadı.');saveW();return}
        const yk=(group('g_yk')?.members||[]).filter(live);
        enterRoom('g_toplanti',yk,true);gmNote('g_toplanti','🏛 Haftalık YK toplantısı başladı.');openChat('g_toplanti');
        const chair=['murat','faruk'].find(live);
        if(state.S.model&&chair)runAgent(agent(chair),'g_toplanti','Haftalık YK toplantısını aç: bu haftanın gündemini (nakit, banka, aile, Ankara) iki cümleyle özetle ve Başkan\'a söz ver.',99,true);
        saveW();
      }});
  }
}
export const THEMES=[
  {name:'Cuma Akşamı Muhabbet',ico:'🍻',tur:'sosyal',pool:['murat','aylin','sevgi','kerem','orhan']},
  {name:'Finans Ekibi',ico:'📈',tur:'is',pool:['aylin','deniz','can','nazli','tolga']},
  {name:'Saha Dostları',ico:'🏭',tur:'is',pool:['ali','hatice','emre','gul']},
  {name:'Hafta Sonu Futbol',ico:'⚽',tur:'sosyal',pool:['can','berk','emre','mehmet','tolga','ali']},
  {name:'Basın & Kulis',ico:'🗞',tur:'dedikodu',pool:['ece','hakan','tolga','zeynep']},
  {name:'Hanedan Sofrası',ico:'🕯',tur:'aile',pool:['kerem','murat','faruk']},
];
export function tryInvite(){
  if(state.W.calm===undefined)return false;
  const F=state.W.fin,d=day(clkNow());
  if(d-(F.lastInvite??-99)<4||ringQ.length||ringCur)return false;
  const opp=isOpp();
  if(opp&&Math.random()<.85)return false;   // muhalifken neredeyse hiç davet edilmezsin
  const inGroups=(state.W.xgroups||[]).map(g=>g.name);
  const likes=id=>live(id)&&loyOf(id)>=(opp?72:60);
  let inv=null;
  // A) ajanların kendi kurduğu gizli grup
  const bgs=(state.W.bgroups||[]).filter(g=>g.members.filter(live).length>=3&&!inGroups.includes(g.name));
  if(bgs.length&&Math.random()<.45){
    const g=bgs[Math.floor(Math.random()*bgs.length)],who=g.members.filter(m=>likes(m)&&(g.tur!=='koalisyon'||loyOf(m)>=72));
    if(who.length)inv={kind:'bg',g,by:who[Math.floor(Math.random()*who.length)]};
  }
  // B) yeni grup teması
  if(!inv){
    const ths=THEMES.filter(t=>!inGroups.includes(t.name)&&!GROUPS.some(g=>g.name===t.name));
    for(const t of ths.sort(()=>Math.random()-.5)){
      const pool=t.pool.filter(live),by=pool.filter(likes);
      if(pool.length>=3&&by.length){const b=by[Math.floor(Math.random()*by.length)];inv={kind:'theme',t,by:b,mem:pool.filter(m=>m!==b&&loyOf(m)>=35).slice(0,4)};if(inv.mem.length>=2)break;inv=null}
    }
  }
  if(!inv)return false;
  F.lastInvite=d;
  const name=inv.kind==='bg'?inv.g.name:inv.t.name, members=inv.kind==='bg'?inv.g.members.filter(m=>live(m)&&m!==inv.by):inv.mem;
  const names=[inv.by,...members].map(m=>fnm(agent(m).name)).join(', ');
  ring({who:inv.by,kind:'invite',title:'Grup daveti',ok:'Katıl',no:'Şimdilik hayır',
    text:`"${name}" grubuna seni de ekleyelim mi? Üyeler: ${names}.`,
    onAnswer:ok=>{
      if(!ok){loyAdd(inv.by,-2);pushMsg(inv.by,{who:'gm',act:true,text:'Grup davetini reddettin.',t:Date.now()});saveW();return}
      let id;
      if(inv.kind==='bg'){
        id=createUserGroup(inv.g.name,'🕶',[...new Set([...inv.g.members,inv.by])],inv.g.tur);
        state.M[id]=(state.M[inv.g.id]||[]).map(m=>({...m}));          // geçmiş yazışmayı da getir
        state.W.bgroups=(state.W.bgroups||[]).filter(g=>g.id!==inv.g.id);delete state.M[inv.g.id];
      }else id=createUserGroup(inv.t.name,inv.t.ico,[inv.by,...inv.mem],inv.t.tur);
      loyAdd(inv.by,3);state.W.chron.push(`Başkan "${name}" grubuna katıldı.`);saveW();saveM();
      gmNote(id,`👥 Gruba katıldın. Üyeler: ${names}.`);openChat(id);
      if(state.S.model)runAgent(agent(inv.by),id,'Başkan az önce gruba katıldı; kısa ve samimi bir hoş geldin yaz (en fazla 2 cümle).',99,true);
    }});
  return true;
}
export function groupCheck(){   // kullanıcı gruplarında sadakat çok düşerse atılırsın
  (state.W.xgroups||[]).slice().forEach(x=>{
    const mem=x.members.filter(live);if(!mem.length){removeUserGroup(x.id,'grupta kimse kalmadı.');return}
    if(mem.reduce((s,i)=>s+loyOf(i),0)/mem.length<32)removeUserGroup(x.id,'üyeler seni artık aralarında istemiyor.');
  });
}

/* ---------- kancalar ---------- */
on('time:newDay',()=>{if(Math.random()<.4)tryInvite()},80);
on('time:newDay',({months})=>{if(months.length)groupCheck()},90);

/* ================= Durum ================= */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=t=>new Date(t).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const jget=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}};
const jset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const defS=()=>({base:'http://localhost:20128/v1',key:'',model:'',lang:'tr-TR',voiceOn:true,handsfree:false,autoHud:true,showBack:true,backAuto:true,chain:true,agents:structuredClone(DEF_AGENTS)});
let S=jget('hold_s',null)||defS(), M=jget('hold_m',{}), W=jget('hold_w',null);
(()=>{ // eski kayıtlara yeni kadroyu ekle
  const idx=id=>{const i=DEF_AGENTS.findIndex(d=>d.id===id);return i<0?999:i};
  for(const d of DEF_AGENTS){const a=S.agents.find(x=>x.id===d.id);if(!a)S.agents.push(structuredClone(d));else if(a.grp===undefined&&d.grp)a.grp=d.grp}
  S.agents.sort((a,b)=>idx(a.id)-idx(b.id));
  if(S.chain===undefined)S.chain=true;
  if(S.showBack===undefined)S.showBack=true; if(S.backAuto===undefined)S.backAuto=true; jset('hold_s',S);
})();
const saveS=()=>jset('hold_s',S), saveW=()=>jset('hold_w',W);
let saveT; const saveM=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{const o={};for(const k in M)o[k]=M[k].slice(-100);jset('hold_m',o)},400)};
const agent=id=>S.agents.find(a=>a.id===id);
const isGroup=id=>String(id).startsWith('g_');
const group=id=>GROUPS.find(g=>g.id===id);
// Kadro: W.org = {fired:[id], mem:{grupId:[id]}}; üyelik değişince GROUPS üyeleri buradan yeniden hesaplanır
const GROUPS0=GROUPS.map(g=>[...g.members]);
const fired=id=>(W?.org?.fired||[]).includes(id);
const baseMem=gid=>GROUPS0[GROUPS.findIndex(g=>g.id===gid)]||[];
function applyOrg(){
  const hi=W?.org?.hired||[];   // sonradan işe alınanlar W içinde yaşar (geri alma ile uyumlu)
  S.agents=S.agents.filter(a=>!a.hired||hi.some(h=>h.id===a.id));
  hi.forEach(h=>{if(!S.agents.some(a=>a.id===h.id))S.agents.push(structuredClone(h))});
  GROUPS.forEach(g=>{g.members=(W?.org?.mem?.[g.id]||baseMem(g.id)).filter(x=>!fired(x))});
  GROUPS[0].members=S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)).map(a=>a.id)}
applyOrg();
const chatIds=()=>[...GROUPS.map(g=>g.id),...S.agents.map(a=>a.id)];
const isBack=id=>/^(dm|bg):/.test(String(id));          // perde arkası: dm: ikili, bg: ajanların kurduğu gizli grup
const isBg=id=>String(id).startsWith('bg:');
const isChan=id=>String(id).startsWith('ch_');
const bgroup=id=>(W?.bgroups||[]).find(g=>g.id===id);
const fnm=n=>String(n||'').replace(/^(Prof\. Dr\.|Av\.)\s*/,'').split(' ')[0];   // unvansız ilk ad
const dmId=(a,b)=>'dm:'+[a,b].sort().join('|');
const backIds=id=>isBg(id)?(bgroup(id)?.members||[]):id.slice(3).split('|');
const backName=id=>isBg(id)?'🕶 '+(bgroup(id)?.name||'Gizli grup'):backIds(id).map(x=>fnm(agent(x)?.name)||x).join(' ↔ ');
const chatName=id=>isGroup(id)?group(id).name:isChan(id)?CHANS.find(c=>c.id===id).name:isBack(id)?backName(id):agent(id).name;
const membersOf=id=>isGroup(id)?group(id).members.map(agent).filter(Boolean):[agent(id)];
let current='g_genel', unread={}, typing={}, speakingNow=new Set(), voices=[];
const ctrls=new Map(), elOf=new Map();
let epoch=0; const snaps=[];   // geri alma: epoch artınca eski (bayat) asenkron işler sonuçlarını uygulamaz
const msgs=c=>M[c]||(M[c]=[]);

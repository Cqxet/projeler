import {CHANS,DEF_AGENTS,GROUPS,GROUPS0} from './data.js';
import {emit} from './hooks.js';
import {jget,jset} from './lib/util.js';
/* ================= Durum ================= */
// Paylaşılan değişken durum: eskiden global `let` değişkenleriydi (S, M, W, current, unread, ...)
export const defS=()=>({base:'http://localhost:20128/v1',key:'',model:'',lang:'tr-TR',voiceOn:true,handsfree:false,autoHud:true,showBack:true,backAuto:true,chain:true,agents:structuredClone(DEF_AGENTS)});
export const state={S:null,M:{},W:null,current:'g_genel',unread:{},typing:{},voices:[],epoch:0,chainGen:0,backBusy:false,ticking:false,tickTimer:null,pending:0,rec:null};
// localStorage'dan yükle (anahtarlar ve biçim değişmedi: hold_s, hold_m, hold_w)
export function initState(){
  state.S=jget('hold_s',null)||defS(); state.M=jget('hold_m',{}); state.W=jget('hold_w',null);
  migrateS(); applyOrg();
}
export function migrateS(){ // eski kayıtlara yeni kadroyu ekle
  const idx=id=>{const i=DEF_AGENTS.findIndex(d=>d.id===id);return i<0?999:i};
  for(const d of DEF_AGENTS){const a=state.S.agents.find(x=>x.id===d.id);if(!a)state.S.agents.push(structuredClone(d));else if(a.grp===undefined&&d.grp)a.grp=d.grp}
  state.S.agents.sort((a,b)=>idx(a.id)-idx(b.id));
  if(state.S.chain===undefined)state.S.chain=true;
  if(state.S.showBack===undefined)state.S.showBack=true; if(state.S.backAuto===undefined)state.S.backAuto=true; jset('hold_s',state.S);
}
export const saveS=()=>jset('hold_s',state.S), saveW=()=>jset('hold_w',state.W);
export let saveT; export const saveM=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{const o={};for(const k in state.M)o[k]=state.M[k].slice(-100);jset('hold_m',o)},400)};
export const agent=id=>state.S.agents.find(a=>a.id===id);
export const isGroup=id=>String(id).startsWith('g_');
export const group=id=>GROUPS.find(g=>g.id===id);
// Kadro: W.org = {fired:[id], mem:{grupId:[id]}}; üyelik değişince GROUPS üyeleri buradan yeniden hesaplanır
export const fired=id=>(state.W?.org?.fired||[]).includes(id);
export const baseMem=gid=>GROUPS0[GROUPS.findIndex(g=>g.id===gid)]||[];
export function applyOrg(){
  emit('beforeApplyOrg');
  const hi=state.W?.org?.hired||[];   // sonradan işe alınanlar W içinde yaşar (geri alma ile uyumlu)
  state.S.agents=state.S.agents.filter(a=>!a.hired||hi.some(h=>h.id===a.id));
  hi.forEach(h=>{if(!state.S.agents.some(a=>a.id===h.id))state.S.agents.push(structuredClone(h))});
  GROUPS.forEach(g=>{g.members=(state.W?.org?.mem?.[g.id]||baseMem(g.id)).filter(x=>!fired(x))});
  GROUPS[0].members=state.S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)).map(a=>a.id)}
export const chatIds=()=>[...GROUPS.map(g=>g.id),...state.S.agents.map(a=>a.id)];
export const isBack=id=>/^(dm|bg):/.test(String(id));          // perde arkası: dm: ikili, bg: ajanların kurduğu gizli grup
export const isBg=id=>String(id).startsWith('bg:');
export const isChan=id=>String(id).startsWith('ch_');
export const bgroup=id=>(state.W?.bgroups||[]).find(g=>g.id===id);
export const fnm=n=>String(n||'').replace(/^(Prof\. Dr\.|Av\.)\s*/,'').split(' ')[0];   // unvansız ilk ad
export const dmId=(a,b)=>'dm:'+[a,b].sort().join('|');
export const backIds=id=>isBg(id)?(bgroup(id)?.members||[]):id.slice(3).split('|');
export const backName=id=>isBg(id)?'🕶 '+(bgroup(id)?.name||'Gizli grup'):backIds(id).map(x=>fnm(agent(x)?.name)||x).join(' ↔ ');
export const chatName=id=>isGroup(id)?group(id).name:isChan(id)?CHANS.find(c=>c.id===id).name:isBack(id)?backName(id):agent(id).name;
export const membersOf=id=>isGroup(id)?group(id).members.map(agent).filter(Boolean):[agent(id)];
export const speakingNow=new Set();
export const ctrls=new Map(), elOf=new Map();
export const snaps=[];   // geri alma: epoch artınca eski (bayat) asenkron işler sonuçlarını uygulamaz
export const msgs=c=>state.M[c]||(state.M[c]=[]);

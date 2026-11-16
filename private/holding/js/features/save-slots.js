import {armTask,renderTasks,taskTimers} from '../actions.js';
import {ensure} from './finance.js';
import {on} from '../hooks.js';
import {$,esc,jget,jset} from '../lib/util.js';
import {stopListening} from '../mic.js';
import {renderCfg} from '../settings.js';
import {applyOrg,ctrls,saveS,saveW,snaps,state} from '../state.js';
import {stopSpeech} from '../tts.js';
import {clkStr,openChat,renderHudBar} from '../ui-list.js';
import {updateUndo} from '../undo.js';
/* ---------- ayarlar: bildirim + kayıt yuvaları ---------- */
export const slotKey=n=>'hold_slot_'+n;
export function trimM(){const o={};for(const k in state.M)o[k]=state.M[k].slice(-100);return o}
export function loadData(data){
  state.epoch++;state.chainGen++;ctrls.forEach(c=>c.abort());ctrls.clear();stopSpeech();stopListening();
  taskTimers.forEach(t=>clearTimeout(t));taskTimers.clear();clearTimeout(state.tickTimer);state.typing={};state.backBusy=false;state.ticking=false;
  state.W=data.W;state.M=data.M||{};state.unread={};snaps.length=0;applyOrg();ensure();
  saveW();jset('hold_m',state.M);renderHudBar();renderTasks();(state.W.tasks||[]).forEach(armTask);openChat('g_genel');updateUndo();
  $('cfg').classList.remove('open');
}
on('afterRenderCfg',()=>{
  try{
    const p=$('cfgp');
    const sl=n=>{const s=jget(slotKey(n),null);return `<div class="rxrow"><span>Yuva ${n}: <span class="mut">${s?esc(s.label):'(boş)'}</span></span><span><button data-sv="${n}">Kaydet</button>${s?`<button data-ld="${n}">Yükle</button>`:''}</span></div>`};
    p.insertAdjacentHTML('beforeend',`<h3>💾 Kayıt yuvaları</h3>${sl(1)}${sl(2)}${sl(3)}
      <div class="r2" style="margin-top:8px"><button class="btn" id="rx_exp">⬇ JSON yedeği</button><button class="btn" id="rx_imp">⬆ JSON yükle</button></div><input type="file" id="rx_file" accept=".json" style="display:none">
      <h3>🔔 Bildirimler</h3><div class="chk"><input type="checkbox" id="rx_n"><span>Tarayıcı bildirimi (sekme arka plandayken)</span></div><div class="chk"><input type="checkbox" id="rx_s"><span>Bildirim sesi</span></div>`);
    p.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>{if(!state.W){return}jset(slotKey(b.dataset.sv),{label:`${clkStr()} · ${state.W.hud.tarih} · ${state.W.hud.finans.nakit}`,t:Date.now(),W:state.W,M:trimM()});renderCfg()});
    p.querySelectorAll('[data-ld]').forEach(b=>b.onclick=()=>{const s=jget(slotKey(b.dataset.ld),null);if(s&&confirm('Mevcut oyun silinip bu kayıt yüklenecek. Emin misin?'))loadData(s)});
    $('rx_exp').onclick=()=>{if(!state.W)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({v:1,W:state.W,M:trimM()})],{type:'application/json'}));a.download='soylu-holding-kayit.json';a.click()};
    $('rx_imp').onclick=()=>$('rx_file').click();
    $('rx_file').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!d.W||!d.W.hud)throw 0;if(confirm('Mevcut oyun silinip bu yedek yüklenecek. Emin misin?'))loadData(d)}catch(x){alert('Geçersiz yedek dosyası.')}})};
    $('rx_n').checked=!!state.S.rxNotify;$('rx_n').onchange=e=>{state.S.rxNotify=e.target.checked;saveS();if(state.S.rxNotify&&window.Notification&&Notification.permission==='default')Notification.requestPermission()};
    $('rx_s').checked=state.S.rxSound!==false;$('rx_s').onchange=e=>{state.S.rxSound=e.target.checked;saveS()};
  }catch(e){console.error('realism cfg',e)}
});

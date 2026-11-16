import {fireEv,occ} from './calendar.js';
import {CRISIS_CARDS,crisisCard} from './crisis-cards.js';
import {defenseCtx,memSummarize,pressure} from './defense-memory.js';
import {addDoc} from './documents.js';
import {adopt,ensure,monthClose,sync} from './finance.js';
import {closeQuarter,goalsTick,newQuarter} from './goals.js';
import {groupCheck,isOpp,syncGroups,tryInvite,ykEvent} from './groups.js';
import {azilCheck,endGame} from './impeachment.js';
import {accuse,moleTick,setupMoles} from './mole.js';
import {KNOCK,maybeKnock} from './office.js';
import {act} from './panel-blocks.js';
import {partnerEvents} from './relationship-events.js';
import {ring} from './ring.js';
import {setupYou,youCaught,youLeak,youTick} from './you-mole.js';
import {$} from '../lib/util.js';
import {openHud} from '../panel.js';
import {applyOrg,state} from '../state.js';
import {renderList} from '../ui-list.js';
/* ================= Özellik modülleri =================
   Her özellik import edildiğinde kendi kancalarını (hooks.js) kaydeder; çekirdek onları doğrudan çağırmaz.
   Yeni özellik: js/features/<ad>.js yaz, burada import et (bkz. DEV.md). */
import './tab-title.js';
import './finance.js';
import './documents.js';
import './calendar.js';
import './decisions.js';
import './leak.js';
import './ring.js';
import './scenes.js';
import './relationship-events.js';
import './office.js';
import './groups.js';
import './time.js';
import './morale.js';
import './defense-memory.js';
import './mole.js';
import './you-mole.js';
import './read-ticks.js';
import './goals.js';
import './crisis-cards.js';
import './impeachment.js';
import './panel-blocks.js';
import './commands.js';
import './save-slots.js';
import './knowledge.js';

/* ---------- başlangıç: DOM ekleri ve eski kayıt uyumu (main.js çağırır) ---------- */
export function initFeatures(){
  /* üst çubukta 💰 kısayolu */
  {const b=document.createElement('button');b.className='ib';b.id='rxbtn';b.title='Finans, takvim, kararlar';b.textContent='💰';
   document.querySelector('#side .top > div').prepend(b);
   b.onclick=()=>{openHud();setTimeout(()=>{const t=$('rx_top'),p=$('pnlp');if(t&&p)p.scrollTop+=t.getBoundingClientRect().top-p.getBoundingClientRect().top;window.scrollTo(0,0)},50)}}
  /* sayfanın kendisi asla kaymasın (sadece iç paneller kayar) */
  document.documentElement.style.overflow='hidden';
  const fixScroll=()=>{if(window.scrollX||window.scrollY)window.scrollTo(0,0);const s=document.scrollingElement;if(s&&(s.scrollTop||s.scrollLeft)){s.scrollTop=0;s.scrollLeft=0}if(document.body.scrollTop||document.body.scrollLeft){document.body.scrollTop=0;document.body.scrollLeft=0}};
  window.addEventListener('scroll',fixScroll,true);fixScroll();
  /* test kapısı (eski window.rx adlarıyla) */
  window.rx={newQuarter,closeQuarter,goalsTick,crisisCard,azilCheck,endGame,CRISES:CRISIS_CARDS,youLeak,youTick,youCaught,setupYou,moleTick,accuse,setupMoles,pressure,memSummarize,defenseCtx,partnerEvents,maybeKnock,KNOCK,tryInvite,isOpp,groupCheck,ykEvent,ensure,monthClose,ring,addDoc,fireEv,occ,act,adopt,sync};
  /* eski kayıt uyumu */
  if(state.W){try{syncGroups();applyOrg();ensure();state.W.dec=state.W.dec||[];state.W.docs=state.W.docs||[];state.W.pend=state.W.pend||[];state.W.prom=state.W.prom||[];state.W.cal=state.W.cal||[];renderList()}catch(e){console.error(e)}}
}

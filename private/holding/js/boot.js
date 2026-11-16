import {armTask,renderTasks} from './actions.js';
import {syncAct} from './mic.js';
import {openNg} from './newgame.js';
import {state} from './state.js';
import {renderHeader,renderHudBar,renderList} from './ui-list.js';
import {renderMessages,sysNote} from './ui-messages.js';
/* ================= Başlat ================= */
export function boot(){
renderList(); renderHeader(); renderMessages(); renderHudBar(); syncAct();
(state.W?.tasks||[]).forEach(armTask); renderTasks();
if(!state.W) openNg(); else if(!state.S.model) sysNote('Devam etmek için ⚙ Ayarlar\'dan 9Router modelini seç.');
}

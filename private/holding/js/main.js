/* ================= Giriş noktası =================
   Modül grafiği import/export ile kurulur; yan etkili başlangıç işleri burada, eski script sırasıyla çağrılır.
   Özellik modülleri (js/features/) import edildiklerinde kancalarını kaydeder. */
import { initState } from './state.js';
import { initTts } from './tts.js';
import { initActions } from './actions.js';
import { initBackstage } from './backstage.js';
import { initMic } from './mic.js';
import { initUndo } from './undo.js';
import { initMembers } from './members.js';
import { initTopbar } from './topbar.js';
import { boot } from './boot.js';
import { initFeatures } from './features/index.js';
import { exposeDebug } from './debug.js';

initState();      // 02-state: hold_s / hold_m / hold_w yüklenir, kadro göçü, applyOrg
initTts();        // 05
initActions();    // 07
initBackstage();  // 08
initMic();        // 12
initUndo();       // 13
initMembers();    // 15
initTopbar();     // 16
boot();           // 20
initFeatures();   // özellikler: 💰 kısayolu, kaydırma kilidi, window.rx, eski kayıt uyumu

exposeDebug();    // window.__game (hata ayıklama / test kapısı)

/* ================= Hata ayıklama / test kapısı =================
   window.__game = { state, hooks, rx, m }  — m: tüm modüllerin export'ları tek nesnede (dev/regression.js kullanır).
   Yeni modül eklerseniz buraya da ekleyin (yalnızca test erişimi içindir; oyun buna bağlı değildir). */
import * as hooks from './hooks.js';
import * as data from './data.js'; import * as stateM from './state.js'; import * as uiList from './ui-list.js'; import * as uiMsg from './ui-messages.js';
import * as tts from './tts.js'; import * as ai from './ai-core.js'; import * as actions from './actions.js'; import * as backstage from './backstage.js';
import * as gm from './gm.js'; import * as game from './game.js'; import * as extras from './extras.js'; import * as mic from './mic.js'; import * as undo from './undo.js';
import * as hr from './hr.js'; import * as members from './members.js'; import * as panel from './panel.js'; import * as newgame from './newgame.js';
import * as settings from './settings.js'; import * as agentActions from './agent-actions.js';
import * as num from './lib/num.js'; import * as world from './lib/world.js'; import * as notify from './lib/notify.js';
import * as tabTitle from './features/tab-title.js'; import * as finance from './features/finance.js'; import * as documents from './features/documents.js';
import * as calendar from './features/calendar.js'; import * as decisions from './features/decisions.js'; import * as leak from './features/leak.js';
import * as ring from './features/ring.js'; import * as scenes from './features/scenes.js'; import * as relEv from './features/relationship-events.js';
import * as office from './features/office.js'; import * as groups from './features/groups.js'; import * as time from './features/time.js';
import * as morale from './features/morale.js'; import * as defense from './features/defense-memory.js'; import * as mole from './features/mole.js';
import * as youMole from './features/you-mole.js'; import * as ticks from './features/read-ticks.js'; import * as goals from './features/goals.js';
import * as crisisCards from './features/crisis-cards.js'; import * as impeach from './features/impeachment.js'; import * as panelBlocks from './features/panel-blocks.js';
import * as commands from './features/commands.js'; import * as slots from './features/save-slots.js'; import * as knowledge from './features/knowledge.js';

export function exposeDebug() {
  const m = Object.assign({}, data, stateM, uiList, uiMsg, tts, ai, actions, backstage, gm, game, extras, mic, undo, hr, members, panel, newgame, settings, agentActions,
    num, world, notify, tabTitle, finance, documents, calendar, decisions, leak, ring, scenes, relEv, office, groups, time, morale, defense, mole, youMole, ticks, goals,
    crisisCards, impeach, panelBlocks, commands, slots, knowledge);
  window.__game = { state: stateM.state, hooks, rx: window.rx, m };
}

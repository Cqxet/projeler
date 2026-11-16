import {applyAction} from '../agent-actions.js';
import {loyOf} from '../data.js';
import {dm,hit,live,news} from '../lib/world.js';
import {group,saveW,state} from '../state.js';
import {renderHudBar} from '../ui-list.js';
/* ================= Sızıntı: düşük sadakatli YK/İcra üyeleri kararları basına sızdırabilir ================= */
export function leakCheck(text){
  if(state.W.calm)return;
  const mem=[...new Set([...(group('g_yk')?.members||[]),...(group('g_exco')?.members||[])])].filter(id=>live(id)&&id!=='faruk');
  const sus=mem.filter(id=>loyOf(id)<45&&Math.random()<(55-loyOf(id))/90);
  if(!sus.length)return;
  state.W.leaks=(state.W.leaks||0)+1;
  applyAction({type:'leak',by:sus[0],fact:text,to:'basın'});   // bilgi modeli: kim sızdırdı, kim öğrendi
  const short=text.length>70?text.slice(0,67)+'…':text;
  setTimeout(()=>{if(!state.W)return;
    news(`Kulis: Holding yönetiminde "${short}" konuşuldu; kaynaklar kararın içeriden sızdırıldığını söylüyor.`);
    state.W.hud.itibar.medya='Kulis haberleri: yönetimden sızıntı';
    dm('ece',`${hit()}, bir gazeteci "${short}" konusunu sordu; kaynak yönetim kurulundan biri gibi görünüyor.`);
    saveW();renderHudBar();
  },4000+Math.random()*6000);
}

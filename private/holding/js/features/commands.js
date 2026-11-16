import {addressed} from '../ai-core.js';
import {isBoss} from '../data.js';
import {occ} from './calendar.js';
import {recordDec} from './decisions.js';
import {borcX,ensure,faizM} from './finance.js';
import {accuse} from './mole.js';
import {youCmd} from './you-mole.js';
import {use} from '../hooks.js';
import {clamp,day,fx} from '../lib/num.js';
import {$} from '../lib/util.js';
import {gmNote,lbl,live,loyAdd} from '../lib/world.js';
import {syncAct} from '../mic.js';
import {fnm,saveW,state} from '../state.js';
import {clkNow} from '../ui-list.js';
import {sysNote} from '../ui-messages.js';
/* ---------- komutlar: /karar /söz /randevu /takvim /finans ---------- */
use('send',(text,_snd)=>{
  const t=String(text||'').trim();
  if(state.W&&(state.W.ended||(state.W.you&&(state.W.you.caught||state.W.you.won)))&&!/^\/(yardım|help|komut)/i.test(t)){sysNote('🏁 Oyun bitti. Yeni oyun için ⚙️ menüsünden senaryo seç.');return}
  if(state.W&&/^\/(karar|söz|soz|randevu|takvim|finans|ifşa|ifsa|köstebek|kostebek|sızdır|sizdir|rapor)\b/i.test(t)){
    ensure();const m=t.match(/^\/([a-zçğıöşü]+)\s*([\s\S]*)$/i),cmd=m[1].toLowerCase(),arg=m[2].trim();
    $('text').value='';syncAct();
    if(cmd==='karar'){
      if(!isBoss()){sysNote('Karar yetkisi Başkan\'dadır.');return}
      if(!arg){sysNote('Kullanım: /karar <metin>. Örn: /karar Demir-Çelik için 40 M₺ yatırım onaylandı.');return}
      const d=recordDec(arg,false);gmNote(state.current,`📒 Karar defterine işlendi: ${d.no} · ${arg} · oy ${d.oy}`);
    }else if(cmd==='söz'||cmd==='soz'){
      const pm=arg.match(/^(\S+)\s+(?:(\d+)\s*(?:gün|g)?\s+)?([\s\S]+)$/i);
      const who=pm&&addressed(pm[1],state.S.agents.filter(a=>live(a.id)))[0];
      if(!who){sysNote('Kullanım: /söz Aylin 30 bütçeyi artıracağım  (isim, gün, söz)');return}
      const days=clamp(parseInt(pm[2])||14,1,180);
      state.W.prom=[{id:'p'+Date.now(),who:who.id,text:pm[3].slice(0,100),due:clkNow()+days*1440,st:'open'},...(state.W.prom||[])].slice(0,20);
      loyAdd(who.id,2);saveW();gmNote(state.current,`🤝 ${fnm(who.name)}'e söz verildi (vade ${days} gün): ${pm[3]}`);
    }else if(cmd==='randevu'){
      const tm=arg.match(/^(\d{1,2})[:.](\d{2})\s+([\s\S]+)$/);
      if(!tm){sysNote('Kullanım: /randevu 14:30 Cem ile görüşme');return}
      let tt=day(clkNow())*1440+(+tm[1])*60+(+tm[2]);if(tt<=clkNow())tt+=1440;
      (state.W.cal||(state.W.cal=[])).push({id:'c'+Date.now(),t:tt,text:tm[3].slice(0,80),done:false});saveW();
      gmNote(state.current,`📅 Randevu eklendi: ${lbl(tt)} · ${tm[3]}`);
    }else if(cmd==='sızdır'||cmd==='sizdir'||cmd==='rapor'){
      youCmd(cmd==='rapor'?'rapor':'sizdir',arg);
    }else if(cmd==='ifşa'||cmd==='ifsa'||cmd==='köstebek'||cmd==='kostebek'){
      accuse(arg);
    }else if(cmd==='takvim'){
      sysNote('📅 '+(occ(clkNow(),clkNow()+14*1440).slice(0,6).map(e=>`${lbl(e.t)} ${e.ad}`).join(' · ')||'Yakında olay yok.'));
    }else{
      const F=state.W.fin;sysNote(`💰 Nakit ${fx(F.nakit)} M₺ · borç ${fx(F.borc)} M₺ (${fx(borcX(),1)}x) · maliyet %${fx(F.faiz,1)} · aylık faiz ${fx(faizM(),1)} M₺ · son ay net ${F.lastNet===null?'-':fx(F.lastNet,1)+' M₺'}`);
    }
    return;
  }
  if(state.W&&/^\/(yardım|help|komut)\b/i.test(t)){_snd(text);sysNote('Gerçekçilik komutları: /karar <metin> · /söz <isim> <gün> <söz> · /randevu 14:30 <konu> · /takvim · /finans · /ifşa <isim>');return}
  return _snd(text);
});

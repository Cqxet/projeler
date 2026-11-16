import {presentOf} from '../ai-core.js';
import {loyOf} from '../data.js';
import {on} from '../hooks.js';
import {agent,elOf,fired,isGroup,msgs,saveM,state} from '../state.js';
import {clkNow,isOffice} from '../ui-list.js';
/* ---------- okundu tikleri: ✓ gönderildi, ✓✓ iletildi, mavi ✓✓ okundu ---------- */
export function setRd(chat,m,l){
  if(!m||(m.rd??2)>=l)return;m.rd=l;
  if(chat===state.current){const el=elOf.get(m),t=el?.parentNode?.querySelector('.tk');if(t){t.className='tk r'+l;t.textContent=l?'✓✓':'✓'}}
}
export function markRead(chat){let ch=false;for(const m of msgs(chat))if(m.who==='user'&&(m.rd??2)<2){setRd(chat,m,2);ch=true}if(ch)saveM()}
export function rdTargets(chat){return isGroup(chat)?presentOf(chat):[chat]}
on('beforePushMsg',({m})=>{if(m&&m.who==='user'&&!m.act&&state.W)m.rd=0});
on('messagePushed',({chat,m})=>{
  const mine=m&&m.who==='user'&&!m.act;
  try{
    if(!state.W||!m)return;
    if(m.who!=='user'&&m.who!=='gm')markRead(chat);          // cevap geldiyse hepsi okunmuştur
    if(mine){
      const tg=rdTargets(chat).filter(x=>agent(x)&&!fired(x)&&x!=='gm');
      if(!tg.length)return;                                    // kimse yok / işten çıkarılmış: tek tik kalır
      const off=!isOffice(clkNow()),lowest=Math.min(...tg.map(x=>loyOf(x)));
      setTimeout(()=>{setRd(chat,m,1);saveM()},350+Math.random()*600);
      const wait=(off?15000+Math.random()*25000:lowest<35?9000+Math.random()*14000:1400+Math.random()*3800);
      setTimeout(()=>{setRd(chat,m,2);saveM()},wait);
    }
  }catch(e){}
},20);
on('typing',({chat,on:isOn})=>{if(isOn)markRead(chat)});

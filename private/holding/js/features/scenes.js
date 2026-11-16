import {ring} from './ring.js';
import {on} from '../hooks.js';
import {notify} from '../lib/notify.js';
import {day} from '../lib/num.js';
import {live} from '../lib/world.js';
import {agent,state} from '../state.js';
/* ---------- kişisel sahneler ---------- */
export const SCENES=[
  {id:'baba',who:'kerem',title:'Hastane koridoru',text:'Baba\'nın tahlilleri çıktı. Hastaneye gelecek misin? Yalnız kalmak istemiyorum.',hint:'Hastane koridorunda Başkan\'la karşılaşıyorsun; babanız Rıza Soylu\'nun durumundan ve miras kaygısından duygusal ama temkinli bahset. En fazla 3 cümle.',loy:[5,-4]},
  {id:'sofor',who:'mehmet',title:'Akşam yolu',text:'Başkanım, bu akşam eve kendim bırakayım; yolda bir derdiniz varsa dinlerim.',hint:'Arabada, akşam trafiğinde Başkan\'la baş başasın. Halk deyimleriyle, babacan bir sohbet aç; duyduğun bir şeyi ima et. En fazla 3 cümle.',loy:[4,-2]},
  {id:'cay',who:'fatma',title:'Çay ocağı',text:'Yavrum, akşam yemeği getirdim; ofiste hâlâ mısın? Biraz otur, bir şey yiyelim.',hint:'Çay ocağında Başkan\'a sıcak bir ikramla yaklaş ve binadan duyduğun bir dedikoduyu kendi sade diliyle anlat. En fazla 3 cümle.',loy:[4,-2]},
  {id:'yemek',who:'murat',title:'Akşam yemeği',text:'İş konuşmayacağız söz; akşam yemeğine çıkalım mı? Biraz rahatlarız.',hint:'Akşam yemeğinde Murat Kaya olarak rahat ve savunmasızsın; çıkarını belli etmeden samimi bir şeyler söyle. En fazla 3 cümle.',loy:[3,-2],not:'calm'},
  {id:'gece',who:'aylin',title:'Gece mesaisi',text:'Rakamlarda tutarsız bir şey gördüm; 10 dakikanız var mı? Ofisteyim.',hint:'Gece ofiste Başkan\'ı arıyorsun: nakit/borç rakamlarında dikkatini çeken bir kaygıyı net söyle. En fazla 3 cümle.',loy:[4,-3]},
  {id:'dogum',who:'zeynep',title:'Küçük bir iltimas',text:'Yarın annenizin doğum günü, kaçırmayın istedim. Çiçek ve hediye ayarlayayım mı?',hint:'Başkan\'ın annesinin doğum gününü hatırlatan özel sekreter olarak sıcak ve düzenli konuş; çiçek/hediye öner. En fazla 2 cümle.',loy:[3,-1]},
];
export function maybeScene(o,n){
  const F=state.W.fin;
  for(let d=Math.max(day(o),day(n)-3);d<=day(n);d++){
    const t=d*1440+1140;if(!(t>o&&t<=n))continue;
    if(d-F.sceneDay<5||Math.random()>.6)continue;
    const pool=SCENES.filter(s=>live(s.who)&&!(s.not==='calm'&&!state.W.calm&&false)&&!F.sceneLog.slice(-4).includes(s.id));
    if(!pool.length)continue;
    const s=pool[Math.floor(Math.random()*pool.length)];
    F.sceneDay=d;F.sceneLog.push(s.id);
    ring({who:s.who,kind:'scene',title:s.title,text:s.text,hint:s.hint,loy:s.loy});
    notify(agent(s.who).name,s.text,s.who);
  }
}

/* ---------- kancalar ---------- */
on('time:advance',({from,to})=>maybeScene(from,to),40);

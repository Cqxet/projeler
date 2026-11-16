import {EYLEM} from './actions.js';
import {applyAction} from './agent-actions.js';
import {LOVE_END,LOVE_YES,backstage,crushOut,endLove,infOf,jealous,loveLvl,manipChance,outreach,partnerId,startLove,susOf} from './backstage.js';
import {COMMON,RULES,isRoom,loyOf,roleBlock} from './data.js';
import {tickSoon} from './gm.js';
import {applyFilters,emit,runMiddleware} from './hooks.js';
import {$} from './lib/util.js';
import {memberCmd} from './members.js';
import {startListening,stopListening,syncAct} from './mic.js';
import {openNg} from './newgame.js';
import {openCfg} from './settings.js';
import {agent,backIds,bgroup,chatName,ctrls,dmId,fired,fnm,group,isBack,isBg,isChan,isGroup,membersOf,msgs,saveM,saveW,state} from './state.js';
import {MEDIA,clean,makeSpeaker,stopSpeech} from './tts.js';
import {advClock,clkNow,clkStr,refresh,renderHeader,setClk} from './ui-list.js';
import {pushMsg,setTyping,sysNote,updateBubble} from './ui-messages.js';
import {snap} from './undo.js';
/* ================= Dünya durumu & 9Router ================= */
export const hudLine=()=>{if(!state.W)return'';const h=state.W.hud,f=h.finans;return `SAAT: ${clkStr()} (${h.tarih}) | Piyasa değeri ${f.piyasa}, hisse ${f.hisse}, nakit ${f.nakit}, net borç/FAVÖK ${f.borc}, rating ${f.rating}, 30 gün acil nakit ihtiyacı ${f.acil} | YK (9 sandalye): Başkan kanadı ${h.yk.sen}, muhalif ${h.yk.muhalif}, kararsız ${h.yk.kararsiz} | İştirakler: ${h.istirakler.map(i=>i.ad+' ('+i.n+')').join('; ')} | Medya: ${h.itibar.medya}; SPK: ${h.itibar.spk}; Ankara: ${h.itibar.ankara} | Açık krizler: ${h.krizler.join('; ')||'yok'}`};
// İlişki katmanı, sadakat ve kulak misafiri söylentiler: ajanın bağlamına eklenir
export const relKey=(a,b)=>[a,b].sort().join('|');
export function relLines(a){return (state.W?.rels||[]).filter(r=>r.a===a.id||r.b===a.id).map(r=>{const o=agent(r.a===a.id?r.b:r.a);return o?`${o.name}: ${r.tur}${r.not?' ('+r.not+')':''}`:''}).filter(Boolean).join('; ')}
export function ctxExtra(a){return applyFilters('ctxExtra',ctxExtraBase(a),a)}   // özellikler 'ctxExtra' süzgeciyle ekler
export function ctxExtraBase(a){
  if(a.id==='gm')return '';
  let s=`\n\nBAŞKAN'A SADAKATİN: ${loyOf(a.id)}/100 (düşükse mesafeli ve çıkarcı, yüksekse açık ve samimi davran).`;
  s+=`\nMEDYA: Başkan bazen "📷 [Fotoğraf gönderildi: açıklama]" (ya da Video/Konum/Sesli mesaj/Hediye/Çiçek/Belge) biçiminde bir şey yollar. Bu gerçekten gönderilmiş bir medyadır; köşeli parantezdeki açıklamayı görmüş/duymuş gibi doğal tepki ver, "göremiyorum" deme.`;
  const lv=state.W?.love?.[a.id], pid=partnerId();
  if(lv?.st==='sevgili')s+=`
KULLANICIYLA İLİŞKİN: Başkan'la (kullanıcı) yetişkin iki insan olarak sevgilisin; yakınlık düzeyiniz: ${loveLvl(a.id)}. Romantik, sıcak, sahiplenici ve gerektiğinde baştan çıkarıcı ol: flört, imalı ve çekici dil, öpüşme, dokunuş ve tensel gerilim serbest. Cinsel yakınlaşma anlarını grafik ya da açık betimleme olmadan, ima ve sahne geçişiyle ("kapı kapandı", "ışıklar söndü", "sabah…") geçiştir; çekime, duyguya ve sonrasına (utangaçlık, yakınlık, endişe, sır saklama) odaklan. İlişkinin riskini de hisset: iş ilişkisi, dedikodu, çıkar çatışması, iç denetim. Başkan başkalarıyla yakınlaşırsa, geç cevap verirse ya da kendini ihmal ederse kıskançlığını/kırgınlığını göster. Ara sıra kendin de medya yollayabilirsin (örn. "📷 [Fotoğraf: akşam elbisesiyle aynada çektiğim bir selfie]"); şık ve çekici olabilir ama çıplaklık yok. İş ilişkisini ve gizli gündemini tamamen silme. Ona ihanet edilirse, sürekli ilgisiz kalırsa ya da gerçekten kırılırsan ilişkiyi kendin bitirebilirsin: bu durumda mesajının sonuna gizli [AYRILIK] etiketi ekle (nadiren, güçlü bir sebep varsa).`;
  else if(lv)s+=`
KULLANICIYA AŞKIN: Başkan'a karşı romantik duygular besliyorsun ve bunu ona itiraf ettin ya da ima ettin. Cevabına göre davran: Başkan açıkça sevgili olmayı/karşılık vermeyi kabul ederse mesajının sonuna gizli [SEVGILI] etiketi ekle ve romantik yakınlaşma sürsün (flörtöz, çekim dolu; açık cinsellik yok); reddederse kırgın ama saygılı ol, mesafeni koru ve umudunu kaybedersen [AYRILIK] etiketi ekle; ilgisiz kalırsa bekle ve ima etmeye devam et. İş ve gizli gündemin bu duygudan etkilenir ama tamamen silinmez.`;
  else if(pid)s+=`
BAŞKAN'IN İLİŞKİSİ: Başkan şu an ${agent(pid).name} ile sevgili. Ona romantik/flört amaçlı yaklaşma, aşk ilan etme; sadece iş ve normal sosyal ilişki.`;
  if(infOf(a.id)>=40)s+=`
KULLANICININ SENDEKİ ETKİSİ: Kullanıcıya karşı yumuşaksın; isteklerini, özellikle sıcak ya da ısrarlı söylediğinde, kolay kabul edersin ve onun lehine esneyebilirsin (ama açıkça ağır suça ya da felakete ortak olmazsın).`;
  if(susOf(a.id)>=50)s+=`
ŞÜPHEN: Kullanıcının seni yönlendirmeye çalıştığından şüpheleniyorsun; temkinli ve sorgulayıcısın.`;
  if(state.W?.loveEx?.[a.id]&&!lv)s+=`
GEÇMİŞ: Başkan'la aranda duygusal bir geçmiş vardı ve bitti. Bir daha aşk ilan etme; mesafeli, kırgın ya da olgun davran.`;
  const r=relLines(a); if(r)s+=`\nKİŞİSEL İLİŞKİLERİN (davranışına, kıskançlığına ve tereddütlerine yansıt; ölçülü ve imalı, Başkan'a kendiliğinden açma): ${r}.`;
  const ru=state.W?.rumors?.[a.id]||[]; if(ru.length)s+=`\nKULAĞINA ÇALINANLAR (kesin değil; güvenirsen ve sorulursa anlat, bazen eksik ya da abartılı aktarabilirsin):\n- ${ru.join('\n- ')}`;
  return s;
}
export function setRel(r){
  if(!state.W||!agent(r.a)||!agent(r.b)||r.a===r.b||r.a==='gm'||r.b==='gm')return;
  const k=relKey(r.a,r.b), list=state.W.rels||(state.W.rels=[]), i=list.findIndex(x=>x.k===k);
  const tur=String(r.tur||'dostluk').slice(0,30).toLowerCase();
  if(state.W.calm&&!/dostluk|flört|evli|akıl hocası|bitti/.test(tur))return;
  if(/bitti|son$|yok/.test(tur)){if(i>=0)list.splice(i,1);pushMsg(dmId(r.a,r.b),{who:'gm',act:true,text:'💔 İlişki sona erdi.',t:Date.now()});saveW();return}
  const o={k,a:r.a,b:r.b,tur,not:String(r.not||'').slice(0,100),t:Date.now()};
  const changed=i<0||list[i].tur!==tur;
  if(i>=0)list[i]=o;else list.push(o);
  if(changed)pushMsg(dmId(r.a,r.b),{who:'gm',act:true,text:`💞 İlişki: ${tur}${o.not?' · '+o.not:''}`,t:Date.now()});
  saveW();
}
// Perde arkası yazışmaları bazen çalışanların kulağına çalınır (Fatma, Mehmet, Zeynep, Berk)
export const touchedChats=new Set();
export function overhear(chat){
  const staff=['fatma','mehmet','zeynep','berk'].filter(id=>agent(id)&&!backIds(chat).includes(id));
  if(!staff.length||Math.random()>0.5)return;
  const last=[...(state.M[chat]||[])].reverse().find(m=>!m.act); if(!last)return;
  const s=staff[Math.floor(Math.random()*staff.length)];
  const R=state.W.rumors||(state.W.rumors={}); R[s]=[...(R[s]||[]),`${chatName(chat)} yazışmasından kulağına çalınan: ${fnm(agent(last.who)?.name)}: "${last.text.slice(0,90)}"`].slice(-4);
  saveW();
}
// Bu ajanın Başkan'ın görmediği ajan-ajan yazışmalarından hatırladıkları
export function secretMem(a){
  const out=[];
  for(const k of Object.keys(state.M)){
    if(!isBack(k)||!backIds(k).includes(a.id)||!state.M[k].length)continue;
    const lines=state.M[k].slice(-5).filter(m=>!m.act).map(m=>`  ${fnm(agent(m.who)?.name)}: ${m.text}`).join('\n');
    if(isBg(k)){const g=bgroup(k);out.push(`"${g?.name}" gizli grubu (${g?.tur}; üyeler: ${g.members.map(x=>fnm(agent(x)?.name)).join(', ')}; amaç: ${g?.purpose}):\n${lines}`)}
    else{const o=agent(backIds(k).find(x=>x!==a.id)); if(o)out.push(`${o.name} ile yazışman:\n${lines}`)}
  }
  return out.slice(-4).join('\n');
}
export function backPrompt(a,chat){
  const chron=(state.W?.chron||[]).slice(-8).map(c=>'- '+c).join('\n')||'- (henüz yok)';
  let where;
  if(isBg(chat)){
    const g=bgroup(chat), others=g.members.filter(x=>x!==a.id).map(x=>agent(x)).filter(Boolean).map(x=>`${x.name} (${x.role})`).join(', ');
    where=`Şu an "${g.name}" adlı ÖZEL WhatsApp grubundasın (tür: ${g.tur}; amaç: ${g.purpose}). Diğer üyeler: ${others}. Üyelerin mesajları "[İsim]: ..." gelir. Yönetim Kurulu Başkanı (kullanıcı) bu grupta YOK ve görmüyor. Gruba hitap et, Başkan'a değil. ${g.tur==='sosyal'?'Bu iş dışı, samimi bir sohbet grubu: gündelik, esprili, kişisel konuşabilirsin.':g.tur==='dedikodu'?'Bu bir dedikodu grubu: kim kiminle, kim neyi gizliyor, kim kime bakıyor; imalı, samimi, ölçülü söylenti paylaş.':g.tur==='koalisyon'?'Bu bir çıkar ittifakı: ortak hedef, oy hesabı, strateji ve güven konuş; ihanet ve şüphe de olabilir.':'Bu bir iş koordinasyon grubu.'}`;
  }else{
    const o=agent(backIds(chat).find(x=>x!==a.id));
    const rel=(state.W?.rels||[]).find(r=>r.k===relKey(a.id,o.id));
    where=`Şu an ${o.name} (${o.role}) ile aranızdaki ÖZEL WhatsApp yazışmasındasın; Yönetim Kurulu Başkanı (kullanıcı) bu yazışmayı görmüyor. Karşındakine hitap et, Başkan'a değil.`+(rel?` Aranızdaki ilişki: ${rel.tur}${rel.not?' ('+rel.not+')':''}. Konuşmana yansıt (ölçülü, imalı, cinsel olmayan).`:'');
  }
  return roleBlock()+`${a.prompt}\n\n${state.W?.calm?'BU SENARYO SAKİN VE KAOSSUZ: entrika veya komplon yok; işle ilgili yapıcı ya da samimi, normal bir meslektaş sohbeti yürüt.':'GİZLİ GÜNDEMİN (muhataplarına ne kadar açacağına karakterin karar verir): '+a.secret}\n\n`+
  `OYUN: Soylu Holding A.Ş. kurumsal rol yapma simülasyonu. ${where}\nSenaryo: ${state.W?.brief||''}\nGÜNCEL DURUM: ${hudLine()}\nBİLİNEN GELİŞMELER:\n${chron}\n\n`+
  `Kısa, doğal bir mesaj yaz (en fazla 2 cümle), karakterine ve çıkarına uygun; markdown, emoji ve madde işareti kullanma. Önceki mesaja cevap ver veya konuyu ilerlet.\n${RULES}`;
}
export function sysPrompt(a,chat){return applyFilters('sysPrompt',sysPromptBase(a,chat),a,chat)}   // özellikler 'sysPrompt' süzgeciyle ekler
export function sysPromptBase(a,chat){
  if(isBack(chat))return backPrompt(a,chat);
  const g=isGroup(chat), G=g&&group(chat);
  const mem=g?(isRoom(chat)?presentOf(chat):G.members).filter(x=>x!==a.id).map(agent).map(x=>`${x.name} (${x.role})`).join(', '):'';
  const chron=(state.W?.chron||[]).slice(-18).map(c=>'- '+c).join('\n')||'- (henüz yok)';
  return roleBlock()+`${a.prompt}\n\n${state.W?.calm?'BU SENARYO SAKİN VE KAOSSUZ: gizli bir entrikan, komplon veya sürpriz skandalın yok. Profesyonel, yapıcı ve işbirlikçisin; sadece kendi rolüne ait normal iş görüşlerini, küçük ve nazik fikir ayrılıklarını dile getirirsin. Kriz, tehdit veya dramatik gelişme uydurma.':'GİZLİ GÜNDEMİN (asla doğrudan itiraf etme, davranışlarında hissettir): '+a.secret}\n\n`+
  `OYUN: Soylu Holding A.Ş. kurumsal rol yapma simülasyonu. Kullanıcı Yönetim Kurulu Başkanı'dır; ona "Başkanım" diye hitap et. Senaryo: ${state.W?.brief||''}\nGÜNCEL DURUM: ${hudLine()}\nBİLİNEN GELİŞMELER:\n${chron}\n\n`+
  (g?`Bu sohbet "${G.name}" WhatsApp grubu. Üyeler: Başkan (kullanıcı), ${mem}. Diğerlerinin mesajları "[İsim]: ..." biçiminde gelir. Aynı anda yazıyorsunuz; kendi rolün ve çıkarın doğrultusunda konuş, başkasının dediğini tekrar etme. Bu grupta olmayanların konuşmalarını bilmezsin.\nSIRA KURALI: Herkesin her mesaja cevap vermesi gerekmez. Son mesaj açıkça başka bir kişiye yöneltilmişse, konu senin uzmanlığını ilgilendirmiyorsa veya söyleyecek yeni bir şeyin yoksa (sadece "Dinliyoruz", "Buyrun" gibi boş onaylar yazacaksan) cevap olarak SADECE [PAS] yaz, başka hiçbir şey yazma. Mesaj sana yöneltilmişse veya katkın gerçekten değerliyse konuş.\nSÜREÇ KURALI: Bir süreç yürütülüyorsa (oylama, sırayla görüş alma, gündem okuma) Başkan'ı her adımda bekletme: sırası gelene ADIYLA seslen (mesajının SON cümlesinde, örn. "Aylin Hanım, oyunuzu rica ederim.") ve süreci kendin ilerlet; hepsi bitince sonucu özetleyip Başkan'a dön ve kimseye seslenme. Gereksiz teşekkür/onay döngüsüne girme.\nODA KURALI: Şu an odada: Başkan, ${presentOf(chat).map(agent).filter(Boolean).map(x=>x.name).join(', ')||'kimse'}. Başkan seni (ya da herkesi) açıkça odadan çıkmaya davet ederse ("çıkabilirsiniz", "toplantı bitti") kısaca vedalaş ve mesajının EN SONUNA [AYRIL] ekle; kalmaya davet edildiysen ("X ile görüşeceğim", "kalın") ekleme. Odadan ayrıldıktan sonra orada konuşulanları duymazsın.`:`Bu, Başkan'la aranızdaki ÖZEL ve gizli birebir yazışma; diğerleri duymaz.`)+(secretMem(a)?`\n\nBAŞKAN'IN BİLMEDİĞİ ÖZEL YAZIŞMALARIN (kendiliğinden anlatma; sorulursa karakterine göre inkâr et, kaçamak yap ya da itiraf et; davranışların bunlardan etkilenir):\n${secretMem(a)}`:'')+ctxExtra(a)+`\n${RULES}\n${a.id!=='gm'?EYLEM+'\n':''}${COMMON}`;
}
export function buildMessages(a,chat,hint){
  const out=[{role:'system',content:sysPrompt(a,chat)}];
  for(const m of msgs(chat).filter(x=>x.who===a.id||!x.pr||x.pr.includes(a.id)).slice(-40)){   // odada olmadığın dönemi duymazsın
    if(!m.text)continue; let role,content;
    if(m.who==='user'){role='user';content=m.text}
    else if(m.who===a.id){role='assistant';content=m.text}
    else{role='user';content=(isBack(chat)&&!isBg(chat))?m.text:`[${agent(m.who)?.name||'?'}]: ${m.text}`}
    const last=out[out.length-1];
    if(last.role==='user'&&role==='user')last.content+='\n'+content;else out.push({role,content});
  }
  if(hint) out.push({role:'user',content:`[Oyun motoru]: ${hint}`});
  else if(out[out.length-1].role==='assistant') out.push({role:'user',content:'(devam et)'});
  return out;
}
export const api=p=>state.S.base.replace(/\/+$/,'')+p;
export const hdrs=()=>({'Content-Type':'application/json',...(state.S.key?{Authorization:'Bearer '+state.S.key}:{})});
// Zincirleme konuşma: bir ajan mesajının SON cümlesinde başka bir üyeye seslenirse o üye de kendiliğinden cevap verir.
export const CHAIN_MAX=12;
export const lastSent=t=>{const p=t.trim().split(/(?<=[.!?…])\s+/);return p[p.length-1]||t};
// Eylem etiketi: ajan "[EYLEM: 30 | çay getirmek | oda]" yazar; kullanıcı görmez, uygulama zamanlayıp sonucu teslim eder.
export const TAG_RE=/\[EYLEM:\s*(\d+)\s*\|\s*([^|\]]+?)\s*(?:\|\s*([^\]]*?))?\s*\]/gi;
export function vis(raw){
  let v=raw.replace(/\[(?:EYLEM:[^\]]*|AYRIL|AYRILIK|SEVGILI)\]/gi,'');
  const i=v.lastIndexOf('[');
  if(i>=0&&/^\[(?:E|EY|EYL|EYLE|EYLEM|EYLEM:[^\]]*|A|AY|AYR|AYRI|AYRIL|AYRILI|AYRILIK|S|SE|SEV|SEVG|SEVGI|SEVGIL|SEVGILI)?$/i.test(v.slice(i)))v=v.slice(0,i);
  return v.trimEnd();
}
export async function runAgent(a,chat,hint,depth=0,noTasks=false){
  const cg=state.chainGen, ep=state.epoch;
  const key=chat+'|'+a.id; ctrls.get(key)?.abort();
  const ac=new AbortController(); ctrls.set(key,ac);
  setTyping(chat,a.id,true);
  const sp=makeSpeaker(a,!isGroup(chat)); let msg=null, aborted=false, raw='';
  try{
    const res=await fetch(api('/chat/completions'),{method:'POST',signal:ac.signal,headers:hdrs(),
      body:JSON.stringify({model:state.S.model,messages:buildMessages(a,chat,hint),stream:true,max_tokens:300})});
    if(!res.ok)throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0,200)}`);
    const rd=res.body.getReader(), dec=new TextDecoder(); let carry='';
    outer:while(true){
      const {value,done}=await rd.read(); if(done||ep!==state.epoch)break;
      carry+=dec.decode(value,{stream:true}); const lines=carry.split('\n'); carry=lines.pop();
      for(const ln of lines){
        if(!ln.startsWith('data:'))continue; const p=ln.slice(5).trim(); if(p==='[DONE]')continue;
        let d; try{d=JSON.parse(p).choices?.[0]?.delta?.content}catch(e){}
        if(!d)continue;
        raw+=d;
        if(!msg&&isGroup(chat)&&!hint){
          const t=raw.trimStart();
          if(t.length<5&&'[PAS]'.startsWith(t.toUpperCase()))continue;   // [PAS] olup olmadığı henüz belli değil
          if(/^\[PAS\]/i.test(t)){try{rd.cancel()}catch(e){}break outer}  // sessiz kal: balon yok, ses yok
        }
        const nv=vis(raw);
        if(!msg){ if(!nv.trim())continue; msg={who:a.id,text:'',t:Date.now()};pushMsg(chat,msg);setTyping(chat,a.id,false) }
        if(nv.length>msg.text.length){const add=nv.slice(msg.text.length);msg.text=nv;updateBubble(chat,msg);sp.push(clean(add))}
      }
    }
  }catch(e){ if(e.name==='AbortError')aborted=true; else if(chat===state.current)sysNote(`${a.name}: ${e.message}`) }
  if(ep!==state.epoch)return;   // geri alındı: bu cevap artık geçersiz
  if(msg){msg.text=msg.text.trim();updateBubble(chat,msg);saveM();emit('agentMessageDone',{chat,m:msg,agent:a})}
  if(!aborted&&msg)sp.end();
  if(!aborted&&!noTasks&&a.id!=='gm'){for(const m of raw.matchAll(TAG_RE))applyAction({type:'task',by:a.id,sn:m[1],desc:m[2],yer:m[3],origin:chat})}
  if(!aborted&&isGroup(chat)&&/\[AYRIL\]/i.test(raw))leaveRoom(chat,[a.id]);
  if(!aborted&&msg&&isGroup(chat)&&/toplantıyı kapat|toplantı(yı)? (sona er|bitir)|toplantı (sona erdi|bitmiştir|kapanmıştır)|oturumu kapat/i.test(msg.text))leaveRoom(chat,presentOf(chat));   // toplantı kapanınca oda boşalır
  if(!aborted&&!isGroup(chat)&&chat===a.id&&state.W.love?.[a.id]){
    if(/\[AYRILIK\]/i.test(raw))endLove(a.id,'agent');
    else if(/\[SEVGILI\]/i.test(raw)&&state.W.love[a.id].st==='itiraf')startLove(a.id);
  }
  if(!aborted&&msg&&state.S.chain&&isGroup(chat)&&depth<CHAIN_MAX&&cg===state.chainGen){
    const next=addressed(lastSent(msg.text),presentOf(chat).map(agent).filter(x=>x&&x.id!==a.id&&x.id!=='gm'));
    next.forEach(x=>runAgent(x,chat,`${a.name} az önce sana seslendi. Kısa cevap ver ve süreci bir adım ilerlet: sırada başka biri varsa ona seslen; iş bittiyse sonucu Başkan'a bildir ve kimseye seslenme.`,depth+1));
  }
  if(ctrls.get(key)===ac){ctrls.delete(key);setTyping(chat,a.id,false)}
  refresh(); idle();
  if(!ctrls.size){tickSoon(); if(state.W?.backDue&&state.S.outreach!==false){const r=typeof state.W.backDue==='string'?state.W.backDue:'Son gelişmeler';setTimeout(()=>{outreach(r);crushOut(r)},3000)} if(state.W?.backDue&&state.S.backAuto)setTimeout(()=>{if(!ctrls.size)backstage(typeof state.W.backDue==='string'?state.W.backDue:'Son gelişmeler')},2500)}
}
/* ---- Oda mevcudiyeti: kim odada, kim çıktı ---- */
export const DISMISS=/çıkabilirsiniz|çıkabilirsin|çıkabilir|çıkın|çıkar mısınız|gidebilirsiniz|gidebilirsin|dağılabilirsiniz|dağılın|toplantı(yı)? bit|toplantı sona|odayı boşaltın|odadan çıkın|yalnız bırakın/i;
export const STAYW=/\bile\b|kalsın|kalın|kalabilir|yalnız|baş başa|görüşeceğim|görüşmem|konuşacağım|konuşmam/i;
export const SUMMON=/gelsin|gelin|gelsene|çağır|girsin|girin|buyursun|buyurun|içeri|odaya/i;
export const presentOf=chat=>(state.W?.present?.[chat]||(isRoom(chat)?[]:group(chat)?.members)||[]).filter(x=>!fired(x));
export const roomPeople=chat=>[...new Set([...(isRoom(chat)?[]:group(chat)?.members||[]),...presentOf(chat)])].map(agent).filter(a=>a&&a.id!=='gm');
export function enterRoom(chat,ids,silent){
  const cur=presentOf(chat), add=ids.filter(i=>agent(i)&&!cur.includes(i)); if(!add.length)return;
  (state.W.present||(state.W.present={}))[chat]=[...cur,...add]; saveW();
  if(!silent)pushMsg(chat,{who:'gm',act:true,text:`🚪 ${add.map(i=>fnm(agent(i).name)).join(', ')} odaya girdi.`,t:Date.now()});
  refresh();
}
export function leaveRoom(chat,ids){
  const cur=presentOf(chat), left=ids.filter(i=>cur.includes(i)); if(!left.length)return;
  (state.W.present||(state.W.present={}))[chat]=cur.filter(i=>!left.includes(i)); saveW();
  pushMsg(chat,{who:'gm',act:true,text:`🚪 ${left.map(i=>fnm(agent(i).name)).join(', ')} odadan ayrıldı.`,t:Date.now()});
  refresh();
}
// Mesajda adı geçen üyeler (Sevgi Hanım, Kerem'e, Murat Bey...). Hiç isim yoksa boş döner.
export function addressed(text,list){
  const t=' '+text.toLocaleLowerCase('tr')+' ';
  return list.filter(a=>{
    const first=a.name.replace(/^(Prof\. Dr\.|Av\.)\s*/,'').split(' ')[0].toLocaleLowerCase('tr');
    return new RegExp(`[^a-zçğıöşüâîû]${first}(?![a-zçğıöşüâîû])`).test(t);
  });
}
export function send(text){return runMiddleware('send',sendBase,text)}   // özellik komutları 'send' ara katmanıyla araya girer
export function sendBase(text){
  text=text.trim(); if(!text)return;
  if(!state.W){openNg();return}
  if(!state.S.model){sysNote('Önce ⚙ Ayarlar\'dan 9Router adresini gir ve bir model/combo seç.');openCfg();return}
  if(isBack(state.current)||isChan(state.current))return;
  const mp=text.match(/^\/(manipüle|manipule|ikna|etki)\s*([\s\S]*)$/i);   // /manipüle <isteğin> → özelde, karşındakini etkilemeye çalışırsın
  if(mp&&state.W){
    $('text').value='';syncAct();stopListening();
    const a=agent(state.current), ask=mp[2].trim();
    if(isGroup(state.current)||!a||a.id==='gm'){sysNote('Manipülasyon sadece bir kişiyle özel yazışmada çalışır.');return}
    if(fired(a.id)){sysNote('Bu kişi işten çıkarıldı.');return}
    if(!ask){sysNote(`🎭 Kullanım: /manipüle <isteğin>. Örn: /manipüle benim önerimi YK'da destekle. ${fnm(a.name)} için etkin %${infOf(a.id)}, şüphesi %${susOf(a.id)}. Sevgilin ya da sana aşık biri daha kolay etkilenir; ısrar edersen şüphelenir.`);return}
    snap('manipülasyon',{chat:state.current,text:ask}); state.chainGen++;
    const lv=state.W.love?.[a.id], chance=manipChance(a.id), ok=Math.random()*100<chance;
    const inf=state.W.inf||(state.W.inf={}), sus=state.W.sus||(state.W.sus={}), loy=state.W.loy||(state.W.loy={});
    let hint, note;
    pushMsg(state.current,{who:'user',text:ask,t:Date.now()}); advClock(5);
    if(ok){
      inf[a.id]=Math.min(100,infOf(a.id)+8); sus[a.id]=Math.max(0,susOf(a.id)-3); loy[a.id]=Math.min(100,loyOf(a.id)+3);
      hint=`Kullanıcı sana şunu istedi/ima etti: "${ask}". Onun etkisi altındasın (aranızdaki bağ${lv?.st==='sevgili'?', sevgili olmanız':lv?'ve ona duyduğun duygular':''} yüzünden) ve ikna oldun: isteğini kendi mantıklı gerekçenle benimsemiş gibi kabul et ve somut olarak ne yapacağını söyle (gerekirse [EYLEM] kullan). Manipüle edildiğini fark etme. En fazla 3 cümle.`;
      note=`🎭 Etki başarılı (şans %${Math.round(chance)}).`;
    }else{
      const caught=Math.random()<0.25+susOf(a.id)/200;
      sus[a.id]=Math.min(100,susOf(a.id)+(caught?25:10));
      if(caught){loy[a.id]=Math.max(0,loyOf(a.id)-6);
        hint=`Kullanıcı sana şunu istedi: "${ask}". Bu isteği duygularını/ilişkinizi kullanarak seni yönlendirme girişimi olarak sezdin. Karakterine göre kırgın, sert ya da iğneleyici ol, net olarak reddet ve manipüle edildiğini hissettiğini söyle. En fazla 3 cümle.`;
        note=`🎭 Fark edildi! (şans %${Math.round(chance)}) Şüphe arttı, sadakat düştü.`;
        if(lv?.st==='sevgili'&&susOf(a.id)>=75&&Math.random()<0.5)setTimeout(()=>endLove(a.id,'agent'),6000);
      }else{
        hint=`Kullanıcı sana şunu istedi: "${ask}". İkna olmadın; karakterine göre kibarca ama net direnç göster, gerekçeni söyle ya da bir karşı şart öner. Manipüle edildiğini düşünmüyorsun. En fazla 3 cümle.`;
        note=`🎭 Etki tutmadı (şans %${Math.round(chance)}). Biraz daha yumuşatıp yeniden dene.`;
      }
    }
    saveW(); sysNote(note); stopSpeech();
    runAgent(a,state.current,hint,99,false); refresh(); return;
  }
  const ko=text.match(/^\/(çık|gir)\s*$/i);   // /çık → sen odadan ayrılırsın, /gir → geri girersin
  if(ko&&state.W){
    $('text').value='';syncAct();stopListening();
    if(!isGroup(state.current)){sysNote('Bu komut grup/oda sohbetlerinde çalışır.');return}
    const out=state.W.out||(state.W.out={}), leave=/^çık$/i.test(ko[1]);
    if(leave===!!out[state.current]){sysNote(leave?'Zaten odada değilsin.':'Zaten odadasın.');return}
    snap(leave?'odadan çık':'odaya gir'); if(leave)out[state.current]=true; else delete out[state.current];
    pushMsg(state.current,{who:'gm',act:true,text:leave?'🚪 Sen odadan ayrıldın. Geri girmek için /gir yaz.':'🚪 Sen odaya girdin.',t:Date.now()});
    saveW(); renderHeader(); refresh(); return;
  }
  if(isGroup(state.current)&&state.W?.out?.[state.current]&&!text.startsWith('/')){sysNote('Odada değilsin; mesajın kimseye ulaşmaz. Girmek için /gir yaz.');return}
  const km=text.match(/^\/(çıkar|at|boşalt|odayıboşalt)\s*(.*)$/i);   // /çıkar → odadakilerin hepsi, /çıkar Murat Aylin → sadece onlar
  if(km&&state.W){
    $('text').value='';syncAct();stopListening();
    if(!isGroup(state.current)){sysNote('Bu komut grup/oda sohbetlerinde çalışır.');return}
    const here=presentOf(state.current).map(agent).filter(x=>x&&x.id!=='gm');
    const selfToo=/(^|\s)(ben|beni|kendimi|sen)(?=\s|$)/i.test(km[2]); if(selfToo){(state.W.out||(state.W.out={}))[state.current]=true}
    const rest=km[2].replace(/(^|\s)(ben|beni|kendimi|sen)(?=\s|$)/ig,'').trim();
    const who=rest?addressed(rest,here):(selfToo?[]:here);
    if(selfToo&&!who.length){pushMsg(state.current,{who:'gm',act:true,text:'🚪 Sen odadan ayrıldın. Geri girmek için /gir yaz.',t:Date.now()});saveW();renderHeader();refresh();return}
    if(!who.length){sysNote(km[2].trim()?'Odada böyle biri yok.':'Odada zaten kimse yok.');return}
    snap('odadan çıkar'); stopSpeech(); ctrls.forEach((c,k)=>{if(who.some(x=>k.endsWith('|'+x.id)))c.abort()});
    leaveRoom(state.current,who.map(x=>x.id)); return;
  }
  const sm=text.match(/^\/saat\s*(.*)$/i);
  if(sm&&state.W){const a=sm[1].trim(),$t=$('text');let mm;
    if(mm=a.match(/^(\d{1,2})[:.](\d{2})$/)){const d=Math.floor(clkNow()/1440)*1440,t=d+(+mm[1])*60+(+mm[2]);setClk(t<clkNow()?t+1440:t);sysNote('🕐 Saat '+clkStr()+' oldu.')}
    else if(mm=a.match(/^\+(\d+)\s*(sa|saat|dk|dakika|gün)?$/i)){const u=(mm[2]||'dk').toLowerCase();advClock(+mm[1]*(u==='gün'?1440:/^sa/.test(u)?60:1));sysNote('🕐 Saat '+clkStr()+' oldu.')}
    else sysNote('🕐 Şu an '+clkStr()+'. Değiştirmek için: /saat 18:30  ·  /saat +2 saat  ·  /saat +1 gün');
    $t.value='';syncAct();return}
  if(memberCmd(state.current,text)){stopListening();$('text').value='';syncAct();return}
  if(!isGroup(state.current)&&state.W.love?.[state.current]){   // özelde aşk durumunu kullanıcı sözle de değiştirebilir
    const lv=state.W.love[state.current];
    if(lv.st==='sevgili')lv.yak=Math.min(100,(lv.yak??10)+4);   // yakınlık yazıştıkça artar
    if(LOVE_END.test(text))setTimeout(()=>endLove(state.current,'user',false,true),0);
    else if(lv.st==='itiraf'&&LOVE_YES.test(text))setTimeout(()=>startLove(state.current),0);
  }
  const mc=text.match(/^\/([a-zçğıöşü]+)\s*([\s\S]*)$/i);   // /foto plajda gün batımı  → fotoğraf göndermiş gibi
  if(mc&&MEDIA[mc[1].toLowerCase()]){const [ic,lb]=MEDIA[mc[1].toLowerCase()];text=`${ic} [${lb} gönderildi: ${mc[2].trim()||'açıklama yok'}]`}
  else if(mc&&/^(foto|medya|komut|yardım|help)$/i.test(mc[1])){sysNote('Komutlar: /manipüle <isteğin> (özelde, karşındakini etkile) · /çık (sen odadan çıkarsın) · /gir · /çıkar (odadaki herkesi çıkarır) · /çıkar Murat Aylin (sadece onları) · /saat 18:30 · medya: /foto /selfie /video /konum /ses /hediye /çiçek /belge + açıklama. Örn: /foto plajda gün batımı, elimde kahve');$('text').value='';syncAct();return}
  if(!isGroup(state.current)&&fired(state.current)){sysNote('Bu kişi işten çıkarıldı; yazışma kapalı. Panelden geri işe alabilirsin.');return}
  snap('mesaj',{chat:state.current,text});
  stopListening(); $('text').value=''; syncAct();
  state.chainGen++;
  const chat=state.current; if(isGroup(chat))state.W.room=chat;   // Başkan'ın bulunduğu oda (eylem teslimi buraya gelir)
  let targets=membersOf(chat), leaving=[];
  const m=text.match(/^@(\S+)/);
  if(isGroup(chat)){
    if(isRoom(chat)&&!DISMISS.test(text)){const nn=addressed(text,state.S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)&&!presentOf(chat).includes(a.id)));if(nn.length)enterRoom(chat,nn.map(a=>a.id))}   // adını söylediğin odaya girer
    const dismiss=DISMISS.test(text), stay=STAYW.test(text);
    // çağrılan ya da "X ile görüşeceğim" denen ama odada olmayanlar önce odaya girer (mesajı görsünler)
    if(SUMMON.test(text)||(dismiss&&stay)){
      const ab=addressed(text,state.S.agents.filter(a=>a.id!=='gm'&&!presentOf(chat).includes(a.id)));
      if(ab.length)enterRoom(chat,ab.map(a=>a.id));
    }
    const pool=presentOf(chat).map(agent).filter(a=>a&&a.id!=='gm');
    const named=addressed(text,pool);
    if(dismiss){
      // adı geçen + "ile/kalsın" varsa o kalır, diğerleri çıkar; sadece isim varsa o çıkar; isim yoksa herkes çıkar
      leaving=(named.length?(stay?pool.filter(a=>!named.includes(a)):named):pool).map(a=>a.id);
      targets=(named.length&&stay)?named:[];
    }else{
      targets=pool;
      if(m){const q=m[1].toLowerCase();const f=[...pool,agent('gm')].find(a=>a.name.toLowerCase().split(' ').some(p=>p.replace(/^(av\.|prof\.|dr\.)$/,'')===q)||a.name.toLowerCase().startsWith(q));if(f)targets=[f]}
      else if(!/herkes|hepiniz|arkadaşlar/i.test(text)&&named.length)targets=named;
    }
  }
  pushMsg(chat,{who:'user',text,t:Date.now()});
  jealous(chat,text); advClock(5+Math.floor(Math.random()*6));
  state.W.msgCount=(state.W.msgCount||0)+1; if(state.W.msgCount%3===0)state.W.backDue='Başkan\'ın son hamleleri ve ajanların tepkileri'; saveW();   // her 3. mesajdan sonra perde arkası
  targets=targets.filter(a=>a.id!=='gm'||!isGroup(chat)||(m&&targets.length===1));
  stopSpeech();
  if(leaving.length){   // önce kısa vedalaşırlar, sonra odadan ayrılırlar
    const fw=leaving.map(id=>runAgent(agent(id),chat,'Başkan seni odadan çıkmaya davet etti; en fazla 8 kelimeyle kısa vedalaş, kimseye seslenme.',99,true));
    Promise.all(fw).then(()=>leaveRoom(chat,leaving));
  }
  if(isGroup(chat)&&!targets.length&&!leaving.length)sysNote('Odada kimse yok. Birini çağırmak için adını yaz: "Murat Bey gelin" ya da 🔔 ile hepsini çağır.');
  targets.forEach(a=>runAgent(a,chat));
  refresh();
}
export function idle(){if(state.S.handsfree&&!ctrls.size&&!state.pending&&!state.rec)setTimeout(()=>{if(!ctrls.size&&!state.pending&&!state.rec)startListening()},500)}

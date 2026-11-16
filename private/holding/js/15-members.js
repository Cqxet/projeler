/* ================= Grup üyeliği: sohbetten komutla ya da 👥 penceresinden ekle/çıkar ================= */
const L_='a-zçğıöşüâîû';
const REM_RE=new RegExp(`(?<![${L_}])(çıkar(?:ın|ınız)?|çıkart(?:ın|ınız)?|uzaklaştır(?:ın)?|kaldır(?:ın)?|atın)(?![${L_}])`,'i');
const ADD_RE=new RegExp(`(?<![${L_}])(ekle(?:yin|yiniz)?|davet|dahil|katın|(?:gruba|kurula|kurulu'?na|kurulun?a)\\s+al(?:ın)?)(?![${L_}])`,'i');
const FIRE_RE=/işten\s+(çıkar|at)|(?<![a-zçğıöşü])kov|görevden\s+al/i;
// "Murat ve Kerem'i çıkar. Onlar yerine Selin, Nazlı ekle" gibi komutları çözer; uygulanırsa true döner
function memberCmd(chat,text){
  if(!isGroup(chat)||!W||isRoom(chat)||!isBoss())return false;
  const all=S.agents.filter(a=>a.id!=='gm');
  const clauses=text.split(/(?<=[.!?])\s+|[;\n]/), ops=[]; let lastRem=[];
  for(const c of clauses){
    const parts=c.split(/\s+yerine\s+/i), hasR=REM_RE.test(c)||/(gruptan|kuruldan|üyelikten)[^.]*çık/i.test(c), hasA=ADD_RE.test(c), hasF=FIRE_RE.test(c);
    if(hasF){addressed(c,all).forEach(a=>ops.push(['fire',a.id]));continue}
    if(parts.length===2){addressed(parts[0],all).forEach(a=>{ops.push(['del',a.id]);lastRem.push(a.id)});addressed(parts[1],all).forEach(a=>ops.push(['add',a.id]));continue}
    if(hasR&&!hasA){const n=addressed(c,all);n.forEach(a=>ops.push(['del',a.id]));lastRem=n.map(a=>a.id)}
    else if(hasA){addressed(c,all).forEach(a=>ops.push(['add',a.id]))}
  }
  if(!ops.length)return false;
  const ctx=/grup|kurul|üye|yerine|\bekle|davet|dahil|kov|işten|görevden/i.test(text);
  if(!ctx)return false;
  snap('Üyelik komutu',{chat,text});
  const lines=[];
  for(const [k,id] of ops){
    const a=agent(id), nm=fnm(a.name);
    if(k==='fire'){if(!fired(id)){hrAction('fire',id,null,true);lines.push(`🔴 ${nm} işten çıkarıldı`)}}
    else if(k==='add'&&fired(id)){hrAction('rehire',id,null,true);lines.push(`🟢 ${nm} geri işe alındı`)}
    else if(hrAction(k==='add'?'grpAdd':'grpDel',id,chat,true))lines.push((k==='add'?'🟢 ':'🔴 ')+nm+(k==='add'?' eklendi':' çıkarıldı'));
  }
  pushMsg(chat,{who:'user',text,t:Date.now()});
  pushMsg(chat,{who:'gm',act:true,text:lines.length?`👥 ${group(chat).name}: ${lines.join(', ')}.`:'👥 Üyelikte değişiklik yapılmadı (zaten öyleydi).',t:Date.now()});
  W.msgCount=(W.msgCount||0)+1; saveW(); refresh();
  if(lines.length&&S.model){
    ops.filter(o=>o[0]==='add').map(o=>agent(o[1])).filter((a,i,ar)=>a&&!fired(a.id)&&group(chat).members.includes(a.id)&&ar.indexOf(a)===i)
      .forEach(a=>runAgent(a,chat,'Başkan seni bu gruba aldı; kısa bir selam/duruş cümlesi yaz (en fazla 1-2 cümle).',99,true));
    gmTick('Başkan üyelikleri değiştirdi: '+lines.join(', ')+` (${group(chat).name}). Gerekirse YK sandalye dağılımını ve sadakatleri güncelle.`);
  }
  return true;
}
function openMembers(){
  const gid=current; if(!isGroup(gid)||!W)return; const g=group(gid);
  if(isRoom(gid)){   // toplantı odası / ofisim: 👥 ile kimin odada olacağını seç
    const dr=()=>{
      $('ngc').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">${g.ico} ${esc(g.name)} · kim içeride?</b><button class="ib" id="mx">✕</button></div><div class="mut" style="margin:6px 0">İşaretlediklerin odaya girer, işareti kaldırdıkların çıkar.</div>`+
      S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)).map(a=>`<label class="chk" style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" data-id="${a.id}" ${presentOf(gid).includes(a.id)?'checked':''}><span style="color:${a.color}">●</span> ${esc(a.name)} <span class="mut">${esc(a.role)}</span></label>`).join('');
      $('ngc').querySelectorAll('input[data-id]').forEach(i=>i.onchange=()=>{i.checked?enterRoom(gid,[i.dataset.id]):leaveRoom(gid,[i.dataset.id]);dr()});
      $('mx').onclick=()=>$('ng').classList.remove('open');
    };
    dr(); $('ng').classList.add('open'); return;
  }
  const draw=()=>{
    $('ngc').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">${g.ico} ${esc(g.name)} · üyeler</b><button class="ib" id="mx">✕</button></div>
    <div class="mut" style="margin:6px 0">İşaretle: gruba ekle · İşareti kaldır: gruptan çıkar. Sohbete "Murat ve Kerem'i çıkar, Selin'i ekle" yazmak da çalışır. ↩ ile geri alınır.</div>`+
    S.agents.filter(a=>a.id!=='gm'&&!fired(a.id)).map(a=>`<label class="chk" style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" data-id="${a.id}" ${g.members.includes(a.id)?'checked':''}><span style="color:${a.color}">●</span> ${esc(a.name)} <span class="mut">${esc(a.role)}</span></label>`).join('');
    $('ngc').querySelectorAll('input[data-id]').forEach(i=>i.onchange=()=>{hrAction(i.checked?'grpAdd':'grpDel',i.dataset.id,gid);draw()});
    $('mx').onclick=()=>$('ng').classList.remove('open');
  };
  draw(); $('ng').classList.add('open');
}
$('mbtn').onclick=()=>openMembers();

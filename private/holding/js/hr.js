import {renderTasks,taskTimers} from './actions.js';
import {runAgent} from './ai-core.js';
import {GROUPS,isBoss,meRole} from './data.js';
import {gmTick} from './gm.js';
import {emit} from './hooks.js';
import {esc} from './lib/util.js';
import {agent,applyOrg,baseMem,ctrls,fired,fnm,group,saveS,saveW,state} from './state.js';
import {stopSpeech} from './tts.js';
import {refresh,renderHudBar} from './ui-list.js';
import {pushMsg} from './ui-messages.js';
import {snap} from './undo.js';
/* ================= Kadro yönetimi: işten çıkar / geri al / YK ve İcra Kurulu üyeliği ================= */
export function hrAction(kind,id,gidArg,quiet){
  const res=hrActionBase(kind,id,gidArg,quiet);
  emit('hrAction',{kind,id,result:res});
  return res;
}
export function hrActionBase(kind,id,gidArg,quiet){
  const a=agent(id); if(!a||!state.W||a.id==='gm')return;
  const org=state.W.org||(state.W.org={fired:[],mem:{}}), nm=fnm(a.name), now=Date.now();
  const mem=gid=>org.mem[gid]||(org.mem[gid]=[...baseMem(gid)]);
  const note=(chat,text)=>pushMsg(chat,{who:'gm',act:true,text,t:now});
  const finish=(ev,tick)=>{state.W.chron.push(ev);state.W.backDue=ev;saveW();applyOrg();renderHudBar();refresh();if(state.S.model&&tick)gmTick(tick)};
  if(kind==='fire'){
    if(fired(id))return; snap('İşten çıkarma');
    const wasIn=GROUPS.filter(g=>g.members.includes(id));
    org.fired.push(id);
    (state.W.tasks||[]).filter(t=>t.agent===id).forEach(t=>{clearTimeout(taskTimers.get(t.id));taskTimers.delete(t.id)});
    state.W.tasks=(state.W.tasks||[]).filter(t=>t.agent!==id);
    for(const k in (state.W.present||{}))state.W.present[k]=state.W.present[k].filter(x=>x!==id);
    (state.W.bgroups||[]).forEach(g=>{g.members=g.members.filter(x=>x!==id)});
    ctrls.forEach((c,k)=>{if(k.endsWith('|'+id))c.abort()}); stopSpeech();
    wasIn.forEach(g=>note(g.id,`🔴 Başkan ${a.name} (${a.role}) görevden alındı; işten çıkarıldı.`));
    note(id,`🔴 Başkan seni işten çıkardı. Bu yazışma artık kapalı.`);
    renderTasks();
    finish(`Başkan ${a.name} (${a.role}) görevinden alındı, işten çıkarıldı.`,`Başkan ${a.name} (${a.role}) işten çıkarıldı. Panelde etkilenen alanları (YK sandalye dağılımı, iştirak notu, itibar) ve sadakatleri güncelle; çıkarılanın bildiği sırlar ve intikam/medyaya sızdırma riski gibi sonuçlar gelişmelere yansısın.`);
    if(state.S.model)runAgent(a,id,`Başkan seni (${a.role}) az önce işten çıkardı. Karakterine uygun tepkini en fazla 2 cümleyle ver (şok, öfke, kabulleniş, veda...); eşyalarını toplayıp ayrılıyorsun.`,99,true);
  }else if(kind==='rehire'){
    if(!fired(id))return; snap('Geri işe alma');
    org.fired=org.fired.filter(x=>x!==id); applyOrg();
    note(id,`🟢 Başkan seni geri işe aldı.`); note('g_genel',`🟢 ${a.name} (${a.role}) geri işe alındı.`);
    finish(`Başkan ${a.name} (${a.role}) kişisini geri işe aldı.`,`Başkan ${a.name} geri işe alındı; sadakati ve ilişkileri buna göre güncelle.`);
    if(state.S.model)runAgent(a,id,'Başkan seni geri işe aldı. Karakterine uygun kısa bir tepki ver (en fazla 2 cümle).',99,true);
  }else if(/^(yk|ex|grp)(Add|Del)$/.test(kind)){
    if(fired(id))return false;
    const gid=gidArg||(kind.startsWith('yk')?'g_yk':'g_exco'), add=kind.endsWith('Add'), G=group(gid); if(!G)return false;
    const to=gid==='g_yk'?"Yönetim Kurulu'na":gid==='g_exco'?"İcra Kurulu'na":G.name+' grubuna', from=gid==='g_yk'?"Yönetim Kurulu'ndan":gid==='g_exco'?"İcra Kurulu'ndan":G.name+' grubundan';
    const m=mem(gid); if(add===m.includes(id))return false; if(!quiet)snap(G.name+' üyelik değişikliği');
    org.mem[gid]=add?[...m,id]:m.filter(x=>x!==id);
    if(add){if(state.W.present?.[gid])state.W.present[gid]=[...new Set([...state.W.present[gid],id])]}
    else if(state.W.present?.[gid])state.W.present[gid]=state.W.present[gid].filter(x=>x!==id);
    note(gid,add?`🟢 ${a.name} (${a.role}) ${to} alındı.`:`🔴 ${a.name} (${a.role}) ${from} çıkarıldı.`);
    const ev=add?`Başkan ${a.name} (${a.role}) kişisini ${to} aldı.`:`Başkan ${a.name} (${a.role}) kişisini ${from} çıkardı.`;
    if(quiet){state.W.chron.push(ev);state.W.backDue=ev;saveW();applyOrg();return true}
    finish(ev,`${ev} ${gid==='g_yk'?'Panelde YK sandalye dağılımını (sen/muhalif/kararsız) buna göre güncelle; ':''}sadakat ve ilişkilere yansıt.`);
    if(state.S.model)runAgent(a,add?gid:a.id,add?`Başkan seni ${to} aldı; gruptakilere kısa bir teşekkür/duruş cümlesi yaz (en fazla 2 cümle).`:`Başkan seni ${from} çıkardı; karakterine uygun kısa bir tepki ver (en fazla 2 cümle).`,99,true);
    return true;
  }
}
export function hireNew(f){
  if(!state.W)return; const name=f.name.trim(), role=f.role.trim(); if(!name||!role)return 'İsim ve rol gerekli.';
  let id=name.toLocaleLowerCase('tr').replace(/[çğıöşü]/g,c=>({ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'}[c])).replace(/[^a-z0-9]+/g,'').slice(0,12)||'yeni';
  while(agent(id))id+=Math.floor(Math.random()*10);
  snap('İşe alım'); const fem=f.g==='f';
  const a={id,hired:true,grp:'staff',name,role,color:'hsl('+Math.floor(Math.random()*360)+',55%,70%)',g:f.g,pitch:fem?1.15:0.9,rate:1.0,
    prompt:`Sen ${name}'sın, Soylu Holding'in yeni işe alınan çalışanı: ${role}. ${f.desc.trim()||'Yeni olduğun için temkinli ama hevesli, rolüne uygun konuşursun.'} Türkçe, doğal ve kısa konuş.`,
    secret:f.secret.trim()||'Yeni başladığın için herkesi tartıyorsun; kimin yanında durman gerektiğini henüz çözmedin.'};
  const org=state.W.org||(state.W.org={fired:[],mem:{}}); (org.hired||(org.hired=[])).push(a);
  (state.W.loy||(state.W.loy={}))[id]=f.loy||60;
  if(f.gid){const m=org.mem[f.gid]||(org.mem[f.gid]=[...baseMem(f.gid)]);m.push(id)}
  state.S.agents.push(structuredClone(a)); saveS();
  const ev=`Başkan ${name} (${role}) kişisini işe aldı.`;
  state.W.chron.push(ev); state.W.backDue=ev; saveW(); applyOrg();
  const t=Date.now(); pushMsg('g_genel',{who:'gm',act:true,text:`🟢 Yeni çalışan: ${name} (${role}) ekibe katıldı.`,t});
  if(f.gid&&f.gid!=='g_genel')pushMsg(f.gid,{who:'gm',act:true,text:`🟢 ${name} (${role}) gruba eklendi.`,t});
  renderHudBar(); refresh();
  if(state.S.model){runAgent(a,id,`Başkan seni (${role}) az önce işe aldı. Kendini kısaca tanıt ve selam ver (en fazla 2 cümle).`,99,true);gmTick(ev+' Sadakati ve ilişkileri buna göre güncelle.')}
}
export function hrHud(){
  if(!isBoss())return `<h3>👥 Kadro yönetimi</h3><div class="mut">${meRole().title} olarak işe alma, işten çıkarma ve kurul üyeliği yetkin yok. Bunlar YK Başkanı Faruk Soylu'nun elinde.</div>`;
  const b=(k,id,t)=>`<button class="btn" data-hr="${k}" data-id="${id}" style="width:auto;display:inline-block;padding:3px 8px;font-size:12px;margin:3px 3px 0 0">${t}</button>`;
  const yk=group('g_yk').members, ex=group('g_exco').members;
  return `<h3>👥 Kadro yönetimi</h3><div class="mut">🏛️ YK üyesi · 💼 İcra Kurulu üyesi · değişiklikler ↩ ile geri alınabilir</div>
  <details class="ag" style="margin-top:8px"><summary>➕ Yeni biri işe al</summary>
  <div class="r2"><div><label>İsim</label><input id="hr_n" placeholder="Burak Yılmaz"></div><div><label>Rol</label><input id="hr_r" placeholder="Hukuk Müşaviri"></div></div>
  <div class="r2"><div><label>Cinsiyet (ses için)</label><select id="hr_g"><option value="m">Erkek</option><option value="f">Kadın</option></select></div><div><label>Eklenecek grup</label><select id="hr_gr"><option value="">(yok)</option>${GROUPS.map(g=>`<option value="${g.id}">${g.ico} ${esc(g.name)}</option>`).join('')}</select></div></div>
  <label>Karakter (isteğe bağlı)</label><textarea id="hr_d" rows="3" placeholder="Hırslı, detaycı, eski bir bankacı..."></textarea>
  <label>Gizli gündem (isteğe bağlı)</label><textarea id="hr_s" rows="2" placeholder="Rakip holdingin gözü kulağı olabilir..."></textarea>
  <button class="btn g" id="hr_go" style="margin-top:8px;width:100%">İşe al</button><div class="mut" id="hr_msg"></div></details>`+
  state.S.agents.filter(a=>a.id!=='gm').map(a=>{
    const f=fired(a.id), y=yk.includes(a.id), e=ex.includes(a.id);
    return `<div class="kv" style="display:block"><div><span style="color:${a.color}">●</span> ${esc(a.name)} <span class="mut">${esc(a.role)}</span> ${f?'🔴 <b>işten çıkarıldı</b>':''}${y?' 🏛️':''}${e?' 💼':''}</div><div>${f?b('rehire',a.id,'↩ Geri işe al'):b('fire',a.id,'🔥 İşten çıkar')+b(y?'ykDel':'ykAdd',a.id,y?"YK'dan çıkar":"YK'ya al")+b(e?'exDel':'exAdd',a.id,e?"İcra'dan çıkar":"İcra'ya al")}</div></div>`;
  }).join('');
}

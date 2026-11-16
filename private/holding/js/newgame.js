import {ROLES,SCEN} from './data.js';
import {startGame} from './game.js';
import {$,esc} from './lib/util.js';
import {state} from './state.js';
/* ================= Yeni oyun ================= */
export function openNg(){
  $('ngc').innerHTML=`<b style="font-size:20px">🏢 Soylu Holding · Yeni Oyun</b>
  <p class="mut">Sen Yönetim Kurulu Başkanısın. Bir senaryo seç: ajanlar karakterlerine ve gizli gündemlerine göre davranır, grup yazışmalarını sadece üyeler duyar.</p>
  <label>Adın (isteğe bağlı)</label><input id="namesel" maxlength="30" placeholder="Örn. Selim Yurt" value="${esc(state.W?.meN||'')}">
  <label>Karakterin</label><select id="gensel"><option value="m" ${state.W?.meG!=='f'?'selected':''}>👨 Erkek</option><option value="f" ${state.W?.meG==='f'?'selected':''}>👩 Kadın</option></select>
  <label>Rolün</label><select id="rolsel">${ROLES.map(r=>`<option value="${r.id}" ${(state.W?.me||'baskan')===r.id?'selected':''}>${r.ico} ${esc(r.title)} · ${esc(r.desc.split(':')[0].split('.')[0].slice(0,50))}</option>`).join('')}</select><div class="mut" id="roldesc"></div>
  ${SCEN.map(s=>`<button class="sc" data-s="${s.id}"><b>${s.ico} ${esc(s.title)}</b><span>${esc(s.desc)}</span></button>`).join('')}
  <h3>Serbest kurulum</h3><textarea id="cust" rows="3" placeholder="Kendi senaryonu yaz: şirket, durum, hedefin…"></textarea>
  <button class="btn g" id="cgo" style="margin-top:8px">Serbest senaryoyla başla</button>
  ${state.W?'<button class="btn" id="cno" style="margin-top:8px;margin-left:8px">Vazgeç</button>':''}`;
  $('ngc').querySelectorAll('.sc').forEach(b=>b.onclick=()=>{if(!state.W||confirm('Mevcut oyun silinecek. Emin misin?'))startGame(SCEN.find(s=>s.id===b.dataset.s))});
  const rd=()=>{const r=ROLES.find(x=>x.id===$('rolsel').value);$('roldesc').textContent=r.desc};$('rolsel').onchange=rd;rd();
  $('cgo').onclick=()=>{const t=$('cust').value.trim();if(!t){$('cust').focus();return}if(!state.W||confirm('Mevcut oyun silinecek. Emin misin?'))startGame(null,t)};
  if($('cno'))$('cno').onclick=()=>$('ng').classList.remove('open');
  $('cfg').classList.remove('open');$('ng').classList.add('open');
}

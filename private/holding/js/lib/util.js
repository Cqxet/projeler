/* ================= Genel yardımcılar (bağımlılıksız) ================= */
export const $=id=>document.getElementById(id);
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const fmt=t=>new Date(t).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
export const jget=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}};
export const jset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

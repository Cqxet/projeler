/* ================= Sayı / zaman yardımcıları (bağımlılıksız) ================= */
export const num=(s,d)=>{const m=String(s??'').match(/-?\d+(?:[.,]\d+)?/);return m?parseFloat(m[0].replace(',','.')):d};   // "870 M₺" → 870
export const fx=(v,d=0)=>(Math.round(v*10**d)/10**d).toFixed(d).replace('.',',');                                      // 12.345 → "12,3"
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rnd=(a,b)=>a+Math.random()*(b-a);
export const day=t=>Math.floor(t/1440);                                                                                 // oyun dakikası → gün
export const hmOf=t=>{const m=((t%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};

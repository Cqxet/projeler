import {on} from '../hooks.js';
import {live,loyAdd} from '../lib/world.js';
import {fired,state} from '../state.js';
/* ================= Moral: biri işten çıkarılınca herkesin sadakati düşer (yönetim -1, çalışanlar -2) ================= */
on('hrAction',({kind,id})=>{if(kind==='fire'&&state.W&&fired(id))state.S.agents.forEach(a=>{if(live(a.id))loyAdd(a.id,a.grp==='staff'?-2:-1)})});

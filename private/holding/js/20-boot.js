/* ================= Başlat ================= */
renderList(); renderHeader(); renderMessages(); renderHudBar(); syncAct();
(W?.tasks||[]).forEach(armTask); renderTasks();
if(!W) openNg(); else if(!S.model) sysNote('Devam etmek için ⚙ Ayarlar\'dan 9Router modelini seç.');

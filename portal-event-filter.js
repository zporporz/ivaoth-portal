/* ===============================
   EVENT OPS FILTER
   Hide Event Ops for routine Online Day events.
=============================== */

(async function(){
  try{
    const res = await fetch('/api/events');
    const events = await res.json();

    const specialEvent = Array.isArray(events)
      ? events.find(e => {
          const title = (e.title || '').toLowerCase();

          return title &&
            !title.includes('online day') &&
            !title.includes('weekly') &&
            !title.includes('friday');
        })
      : null;

    if(specialEvent) return;

    setTimeout(() => {
      const navBtn = document.getElementById('eventModeNav');
      const opsSection = document.getElementById('eventOpsSection');

      if(navBtn) navBtn.remove();
      if(opsSection) opsSection.remove();
    }, 300);

  }catch(err){
    console.warn('Event Ops filter failed', err);
  }
})();

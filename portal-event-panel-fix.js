/* ===============================
   EVENT PANEL FALLBACK FIX
   Keep Online Day visible even if IVAO events API is slow or fails.
=============================== */

function renderOnlineDayFallback(){
  const wrap = document.getElementById('eventPanelList');
  const panel = document.getElementById('eventPanel');
  if(!wrap) return;

  const current = (wrap.textContent || '').trim().toLowerCase();
  const shouldFallback = !current || current === 'loading...' || current.includes('failed');

  if(!shouldFallback) return;

  wrap.innerHTML = `
    <div class="event-panel-card">
      <img class="event-panel-banner" src="https://storage.th.ivao.aero/EVENTS/utilities/Division%20Online%20Day.png" onerror="this.style.display='none'" alt="Division Online Day">
      <div class="event-panel-body">
        <div class="event-panel-title">Division Online Day</div>
        <div class="event-panel-meta">Every Friday • 13:00 – 16:00 UTC</div>
        <div class="event-panel-airports">
          <span>Bangkok FIR</span>
        </div>
        <a href="http://l.th.ivao.aero/discord" target="_blank" class="event-panel-link">Discord →</a>
      </div>
    </div>`;

  if(panel) panel.style.display = 'flex';
}

window.addEventListener('DOMContentLoaded', () => {
  renderOnlineDayFallback();
  setTimeout(renderOnlineDayFallback, 1500);
  setTimeout(renderOnlineDayFallback, 4000);
});

/* ===============================
   PORTAL UI UPGRADES
   Session modal upgrade only
=============================== */

function getSessionProgress(state){
  const s = (state || '').trim().toLowerCase();

  if(s === 'on blocks' || s === 'landed') return 100;
  if(s === 'approach') return 85;
  if(s === 'descent' || s === 'descending') return 75;
  if(s === 'en route' || s === 'cruise') return 55;
  if(s === 'climbing') return 32;
  if(s === 'departing') return 18;
  if(s === 'ground') return 10;

  return 35;
}

function enhanceSessionModal(){
  const original = window.openSession;
  if(!original || window.__sessionEnhanced) return;

  window.__sessionEnhanced = true;

  window.openSession = async function(sessionId, callsign){
    const modal = document.getElementById('sessionModal');
    const body = document.getElementById('sessionBody');

    document.getElementById('sessionTitle').innerText = callsign;
    body.innerHTML = '<div class="msg">Loading enhanced session...</div>';
    modal.style.display = 'flex';

    try{
      const res = await fetch(`/api/session?id=${sessionId}`);
      const d = await res.json();

      const alt = d.altitude ? `${d.altitude.toLocaleString()} ft` : '-';
      const spd = d.ground_speed ? `${d.ground_speed} kts` : '-';
      const hdg = d.heading ? `${d.heading}°` : '-';
      const progress = getSessionProgress(d.state);

      body.innerHTML = `
      <div class="session-hero">
        <div class="session-identity" style="grid-column:1/-1;">
          <div class="event-kicker">Pilot Session Card</div>
          <div class="session-callsign">${d.callsign}</div>

          <div class="subline" style="margin-top:10px;">
            <span class="aircraft-chip">${d.aircraft || '-'}</span>
            <span class="vid-chip">VID ${d.user_id}</span>
            <span class="time-chip">${d.state || 'ONLINE'}</span>
          </div>

          <div class="session-route-big">
            <span>${d.departure || '---'}</span>
            <span class="arrow">→</span>
            <span>${d.arrival || '---'}</span>
          </div>

          <div class="session-progress" title="Flight phase progress: ${progress}%">
            <span style="width:${progress}%"></span>
          </div>
        </div>
      </div>

      <div class="session-data-grid">
        <div class="session-data-card">
          <small>Altitude</small>
          <b>${alt}</b>
        </div>

        <div class="session-data-card">
          <small>Ground Speed</small>
          <b>${spd}</b>
        </div>

        <div class="session-data-card">
          <small>Heading</small>
          <b>${hdg}</b>
        </div>

        <div class="session-data-card">
          <small>Simulator</small>
          <b>${d.simulator || '-'}</b>
        </div>
      </div>

      <div class="session-bottom-grid">
        <div>
          ${d.route ? `
          <div class="session-route">
            <small>Flight Plan Route</small>
            <div class="route-text">${d.route}</div>
          </div>` : ''}

          ${d.remarks ? `
          <div class="session-route">
            <small>Remarks</small>
            <div class="route-text">${d.remarks}</div>
          </div>` : ''}
        </div>

        <div class="session-route">
          <small>Flight Intelligence</small>

          <div class="session-status-list">
            <div class="session-status-row">
              <span>Pilot</span>
              <span>${d.name || 'Unknown'}</span>
            </div>

            <div class="session-status-row">
              <span>Division</span>
              <span>${d.division || '-'}</span>
            </div>

            <div class="session-status-row">
              <span>Rating</span>
              <span>${d.pilot_rating || '-'}</span>
            </div>

            <div class="session-status-row">
              <span>Planned FL</span>
              <span>${d.cruise_altitude || '-'}</span>
            </div>

            <div class="session-status-row">
              <span>Planned Speed</span>
              <span>${d.cruise_speed || '-'}</span>
            </div>

            <div class="session-status-row">
              <span>Tracker</span>
              <span><a href="https://tracker.ivao.aero/sessions/${d.session_id}" target="_blank" style="color:#7db4ff;text-decoration:none;">Open →</a></span>
            </div>
          </div>
        </div>
      </div>
      `;
    }catch(err){
      body.innerHTML = '<div class="msg">Failed to load session.</div>';
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  enhanceSessionModal();
});

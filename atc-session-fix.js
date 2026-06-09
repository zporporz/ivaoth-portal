/* ===============================
   ATC SESSION MODAL FIX
   ATC rows must not use Pilot Session Card.
=============================== */

function formatAtcOnlineTime(value){
  if(!value) return '-';

  const start = new Date(value);
  if(Number.isNaN(start.getTime())) return '-';

  const diff = Math.max(0, Date.now() - start.getTime());
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if(h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

function getFacilityName(station){
  const s = (station || '').toUpperCase();
  const map = {
    DEL: 'Delivery',
    GND: 'Ground',
    TWR: 'Tower',
    APP: 'Approach',
    DEP: 'Departure',
    CTR: 'Control',
    FSS: 'Flight Service'
  };

  return map[s] || s || '-';
}

function isAtcCallsign(callsign){
  return /^[A-Z0-9]{4}_(DEL|GND|TWR|APP|DEP|CTR|FSS|ATIS)$/i.test(callsign || '');
}

async function findAtcBySession(sessionId, callsign){
  let data = window.__liveAtcData;

  if(!Array.isArray(data) || !data.length){
    try{
      const res = await fetch('/api/live-atc');
      if(!res.ok) throw new Error(`Live ATC ${res.status}`);
      data = await res.json();
      window.__liveAtcData = Array.isArray(data) ? data : [];
    }catch{
      data = [];
    }
  }

  const bySession = data.find(a => String(a.session_id) === String(sessionId));
  if(bySession) return bySession;

  const byCallsign = data.find(a => (a.callsign || '').toUpperCase() === (callsign || '').toUpperCase());
  if(byCallsign) return byCallsign;

  const parts = (callsign || '').split('_');
  return {
    session_id: sessionId,
    callsign,
    user_id: '-',
    airport: parts[0] || '-',
    station: parts[1] || 'ATC',
    rating: '-',
    connected_at: null
  };
}

function openAtcSession(atc){
  window.cancelSessionRequests();
  const modal = document.getElementById('sessionModal');
  const body = document.getElementById('sessionBody');
  const title = document.getElementById('sessionTitle');

  if(!modal || !body || !title) return;

  title.innerText = atc.callsign || 'ATC Session';
  modal.style.display = 'flex';

  const station = (atc.station || '').toUpperCase();
  const airport = atc.airport || (atc.callsign || '').split('_')[0] || '-';
  const facility = getFacilityName(station);
  const esc = window.escapeHtml;
  const connectedAt = atc.connected_at
    ? new Date(atc.connected_at).toISOString().replace('T',' ').slice(0,16) + ' UTC'
    : '-';

  body.innerHTML = `
    <div class="session-hero">
      <div class="session-identity" style="grid-column:1/-1;">
        <div class="event-kicker">ATC Session Card</div>
        <div class="session-callsign">${esc(atc.callsign || '-')}</div>

        <div class="subline" style="margin-top:10px;">
          <span class="aircraft-chip">${esc(facility)}</span>
          <span class="vid-chip">VID ${esc(atc.user_id || '-')}</span>
          <span class="time-chip">ONLINE</span>
        </div>

        <div class="session-route-big">
          <span>${esc(airport)}</span>
          <span class="arrow">·</span>
          <span>${esc(station || 'ATC')}</span>
        </div>
      </div>
    </div>

    <div class="session-data-grid">
      <div class="session-data-card">
        <small>Facility</small>
        <b>${esc(facility)}</b>
      </div>

      <div class="session-data-card">
        <small>Airport / Area</small>
        <b>${esc(airport)}</b>
      </div>

      <div class="session-data-card">
        <small>ATC Rating</small>
        <b>${esc(atc.rating || '-')}</b>
      </div>

      <div class="session-data-card">
        <small>Online Time</small>
        <b>${formatAtcOnlineTime(atc.connected_at)}</b>
      </div>
    </div>

    <div class="session-bottom-grid">
      <div class="session-route">
        <small>Controller Information</small>

        <div class="session-status-list">
          <div class="session-status-row">
            <span>Callsign</span>
            <span>${esc(atc.callsign || '-')}</span>
          </div>

          <div class="session-status-row">
            <span>Station</span>
            <span>${esc(station || '-')}</span>
          </div>

          <div class="session-status-row">
            <span>Airport</span>
            <span>${esc(airport)}</span>
          </div>

          <div class="session-status-row">
            <span>Connected</span>
            <span>${connectedAt}</span>
          </div>
        </div>
      </div>

      <div class="session-route">
        <small>Session</small>

        <div class="session-status-list">
          <div class="session-status-row">
            <span>VID</span>
            <span>${esc(atc.user_id || '-')}</span>
          </div>

          <div class="session-status-row">
            <span>Rating</span>
            <span>${esc(atc.rating || '-')}</span>
          </div>

          <div class="session-status-row">
            <span>Type</span>
            <span>ATC</span>
          </div>

          <div class="session-status-row">
            <span>Tracker</span>
            <span><a href="https://tracker.ivao.aero/sessions/${encodeURIComponent(atc.session_id)}" target="_blank" rel="noopener noreferrer" style="color:#7db4ff;text-decoration:none;">Open →</a></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function installAtcOpenSessionGuard(){
  const previousOpenSession = window.openSession;

  if(window.__atcOpenSessionGuardInstalled) return;
  window.__atcOpenSessionGuardInstalled = true;

  window.openSession = async function(sessionId, callsign){
    if(isAtcCallsign(callsign)){
      const atc = await findAtcBySession(sessionId, callsign);
      openAtcSession(atc);
      return;
    }

    if(typeof previousOpenSession === 'function'){
      return previousOpenSession(sessionId, callsign);
    }
  };
}

async function loadLiveAtcFixed(){
  const wrap = document.getElementById('liveAtcTable');
  if(!wrap) return;

  try{
    const res = await fetch('/api/live-atc');
    if(!res.ok) throw new Error(`Live ATC ${res.status}`);
    const data = await res.json();
    window.__liveAtcData = Array.isArray(data) ? data : [];

    const count = document.getElementById('atcCount');
    if(count) count.innerText = Array.isArray(data) ? data.length : '-';

    if(!Array.isArray(data) || !data.length){
      wrap.innerHTML = '<div class="msg">No Thailand ATC online.</div>';
      return;
    }

    wrap.innerHTML = `
      <table class="pro-table">
        <thead>
          <tr>
            <th>Callsign</th>
            <th>Airport</th>
            <th>Station</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((r, index) => `
            <tr>
              <td><a href="#" onclick="event.preventDefault();openAtcSession(window.__liveAtcData[${index}])" class="trk-link">${window.escapeHtml(r.callsign)}</a></td>
              <td><span class="aircraft-chip">${window.escapeHtml(r.airport)}</span></td>
              <td><span class="badge cyan">${window.escapeHtml(r.station)}</span></td>
              <td><span class="badge blue">${window.escapeHtml(r.rating)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }catch(err){
    console.log('Live ATC Fixed Error:', err);
    wrap.innerHTML = '<div class="msg">Failed to load live ATC.</div>';
  }
}

window.openAtcSession = openAtcSession;
window.loadLiveAtcFixed = loadLiveAtcFixed;

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    installAtcOpenSessionGuard();
    loadLiveAtcFixed();
  }, 250);

  setInterval(() => {
    installAtcOpenSessionGuard();
    loadLiveAtcFixed();
  }, 300000);
});

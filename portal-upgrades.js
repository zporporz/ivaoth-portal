/* ===============================
   PORTAL UI UPGRADES
=============================== */

function isRoutineEvent(event){
  const title = (event?.title || '').toLowerCase();
  const description = (event?.description || '').toLowerCase();
  const text = `${title} ${description}`;

  return !title ||
    text.includes('online day') ||
    text.includes('division online') ||
    text.includes('weekly') ||
    text.includes('every friday') ||
    text.includes('friday online');
}

function getSpecialEvent(events){
  if(!Array.isArray(events)) return null;
  return events.find(e => !isRoutineEvent(e)) || null;
}

function injectHotNavigation(){
  const nav = document.querySelector('.nav');
  if(!nav || document.getElementById('eventModeNav')) return;

  const link = document.createElement('a');
  link.id = 'eventModeNav';
  link.href = 'javascript:void(0)';
  link.className = 'hot-link';
  link.innerText = 'Event Ops';
  link.onclick = () => goToSection('eventOpsSection');
  nav.appendChild(link);
}

async function buildEventOps(){
  const statsSection = document.getElementById('statsSection');
  if(!statsSection || document.getElementById('eventOpsSection')) return false;

  let events = [];
  let liveFlights = [];
  let liveAtc = [];

  try{
    events = await fetch('/api/events').then(r=>r.json());
  }catch{}

  const activeEvent = getSpecialEvent(events);
  if(!activeEvent) return false;

  try{
    liveFlights = await fetch('/api/live').then(r=>r.json());
  }catch{}

  try{
    liveAtc = await fetch('/api/live-atc').then(r=>r.json());
  }catch{}

  const eventAirports = activeEvent?.airports?.slice(0,4) || [];
  if(!eventAirports.length) return false;

  const eventTraffic = liveFlights.filter(f =>
    eventAirports.includes(f.departure) || eventAirports.includes(f.arrival)
  );

  const arrivals = eventTraffic.filter(f => eventAirports.includes(f.arrival));
  const departures = eventTraffic.filter(f => eventAirports.includes(f.departure));

  const atcOnline = liveAtc.filter(a =>
    eventAirports.some(ap => (a.callsign || '').startsWith(ap))
  );

  const hero = document.createElement('div');
  hero.className = 'panel ops-panel';
  hero.id = 'eventOpsSection';

  hero.innerHTML = `
  <div class="stats-head">
    <div>
      <h3>Event Ops Center</h3>
      <p class="hint">Live event traffic • ATC coverage • Enhanced session tracking</p>
    </div>
    <div class="live-meta">
      <span class="live-dot"></span>
      <span>Realtime Operations</span>
      <small>NO DATABASE MODE</small>
    </div>
  </div>

  <div class="event-hero">

    <div class="event-main-card">
      <div>
        <div class="event-kicker">Event Mode</div>
        <div class="event-title">${activeEvent.title}</div>
        <div class="event-sub">${activeEvent.description || 'Thailand Division realtime operations center with live traffic intelligence.'}</div>

        <div class="event-meta-row">
          <div class="event-pill">Bangkok FIR</div>
          <div class="event-pill">${eventTraffic.length} Flights</div>
          <div class="event-pill">${atcOnline.length} ATC Online</div>
          <div class="event-pill">Live IVAO API</div>
        </div>
      </div>

      <div>
        <div class="countdown-grid">
          <div class="count-box"><b>${eventTraffic.length}</b><small>FLIGHTS</small></div>
          <div class="count-box"><b>${arrivals.length}</b><small>ARRIVALS</small></div>
          <div class="count-box"><b>${departures.length}</b><small>DEPARTURES</small></div>
          <div class="count-box"><b>${atcOnline.length}</b><small>ATC</small></div>
        </div>
      </div>
    </div>

    <div class="event-side-grid">

      <div class="ops-card">
        <div class="ops-card-head">
          <div class="ops-card-title">Event Airports</div>
          <span class="badge cyan">LIVE</span>
        </div>

        <div class="airport-focus-list">
          ${eventAirports.map(ap => `
            <div class="airport-focus">
              <b>${ap}</b>
              <small>Active Ops</small>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="ops-card">
        <div class="ops-card-head">
          <div class="ops-card-title">ATC Frequencies</div>
          <span class="badge blue">OPS</span>
        </div>

        <div class="freq-strip">
          ${atcOnline.slice(0,6).map(a => `
            <div class="freq-chip">${a.callsign}</div>
          `).join('') || '<div class="hint">No event ATC online yet.</div>'}
        </div>
      </div>

    </div>

  </div>

  <div class="coverage-wrap">

    <div class="coverage-radar">
      <div class="coverage-node full node-bangkok">
        <b>BANGKOK FIR</b>
        <small>Main Coverage</small>
        <div class="pct">100%</div>
      </div>

      <div class="coverage-node full node-chiangmai">
        <b>CHIANG MAI</b>
        <small>Radar Online</small>
        <div class="pct">85%</div>
      </div>

      <div class="coverage-node partial node-south">
        <b>SOUTH TH</b>
        <small>Partial Coverage</small>
        <div class="pct">70%</div>
      </div>

      <div class="coverage-node partial node-udon">
        <b>UDON FIR</b>
        <small>Approach Active</small>
        <div class="pct">65%</div>
      </div>

      <div class="coverage-node none node-offline">
        <b>BORDER AREA</b>
        <small>No ATC Online</small>
        <div class="pct">0%</div>
      </div>
    </div>

    <div class="controller-panel">

      <div class="ops-card">
        <div class="ops-card-head">
          <div class="ops-card-title">ATC Coverage</div>
          <span class="badge green">ONLINE</span>
        </div>

        <div class="coverage-summary">
          <div class="ops-mini">
            <small>Tower</small>
            <b>${liveAtc.filter(a => a.station === 'TWR').length}</b>
          </div>

          <div class="ops-mini">
            <small>Approach</small>
            <b>${liveAtc.filter(a => a.station === 'APP').length}</b>
          </div>

          <div class="ops-mini">
            <small>Center</small>
            <b>${liveAtc.filter(a => a.station === 'CTR').length}</b>
          </div>
        </div>
      </div>

      <div class="ops-card">
        <div class="ops-card-head">
          <div class="ops-card-title">Controllers Online</div>
          <span class="badge cyan">LIVE</span>
        </div>

        ${(liveAtc.slice(0,10)).map(a => `
          <div class="controller-row">
            <span>${a.callsign}</span>
            <span>${a.rating}</span>
          </div>
        `).join('') || '<div class="hint">No Thailand ATC online.</div>'}
      </div>

    </div>

  </div>

  <div class="ops-card event-arrivals">
    <div class="ops-card-head">
      <div class="ops-card-title">Live Event Arrivals</div>
      <span class="badge orange">VT OPS</span>
    </div>

    <table class="pro-table">
      <thead>
        <tr>
          <th>Flight</th>
          <th>Route</th>
          <th>Aircraft</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
      ${eventTraffic.slice(0,8).map(f => `
        <tr>
          <td>
            <a href="javascript:void(0)" onclick="openSession(${f.session_id},'${f.callsign}')" class="trk-link">${f.callsign}</a>
          </td>
          <td>${f.departure || '---'} → ${f.arrival || '---'}</td>
          <td>${f.aircraft || '-'}</td>
          <td>${renderStatus(f)}</td>
        </tr>
      `).join('') || '<tr><td colspan="4">No live event traffic yet.</td></tr>'}
      </tbody>
    </table>
  </div>
  `;

  statsSection.parentNode.insertBefore(hero, statsSection);
  return true;
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

      body.innerHTML = `
      <div class="session-hero">

        <div class="session-identity">
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

          <div class="session-progress">
            <span style="width:${Math.min(92,Math.max(18,(d.ground_speed || 120)/6))}%"></span>
          </div>
        </div>

        <div class="session-map-card">
          <div class="map-route-line"></div>
          <div class="map-plane">✈</div>
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
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const hasSpecialEvent = await buildEventOps();
  if(hasSpecialEvent) injectHotNavigation();
  enhanceSessionModal();
});

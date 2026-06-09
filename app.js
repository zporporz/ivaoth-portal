/* ===============================
   IVAO THAILAND PORTAL - APP.JS
================================= */

const API = "";

let latestData = [];
let latestDepFilter = null;
let latestArrFilter = null;
let searchController = null;
let sessionController = null;

function cancelSessionRequests() {
  sessionController?.abort();
  window.__sessionRequestController?.abort();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function sessionLink(sessionId, callsign) {
  return `<a href="#" class="trk-link js-session-link" data-session-id="${escapeHtml(sessionId)}" data-callsign="${escapeHtml(callsign)}">${escapeHtml(callsign)}</a>`;
}

window.escapeHtml = escapeHtml;
window.safeExternalUrl = safeExternalUrl;
window.cancelSessionRequests = cancelSessionRequests;

/* ===============================
   UI MODE
================================= */
function toggleMode() {
  const on = document.getElementById("modeSwitch").checked;
  document.getElementById("airportWrap").style.display = on ? "block" : "none";
  document.getElementById("depWrap").style.display = on ? "none" : "block";
  document.getElementById("arrWrap").style.display = on ? "none" : "block";
  document.getElementById("bidiWrap").style.display = on ? "none" : "flex";
}

toggleMode();

/* ===============================
   RESET
================================= */
function resetForm() {
  ["airportCodes","dep","arr","fromDate","fromTime","toDate","toTime"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

  latestData = [];
  document.getElementById("results").innerHTML = "";
  document.getElementById("resultSection").style.display = "none";
  document.getElementById("statFlights").innerText = "0";
  document.getElementById("statPilots").innerText = "0";
  document.getElementById("statDep").innerText = "-";
  document.getElementById("statArr").innerText = "-";
}

/* ===============================
   SEARCH FLIGHTS
================================= */
async function searchFlights() {
  searchController?.abort();
  const results = document.getElementById("results");
  results.innerHTML = '<div class="msg">Searching...</div>';
  document.getElementById("resultSection").style.display = "block";

  const fromDate = document.getElementById("fromDate").value;
  const fromTime = document.getElementById("fromTime").value;
  const toDate   = document.getElementById("toDate").value;
  const toTime   = document.getElementById("toTime").value;

  if (!fromDate || !fromTime || !toDate || !toTime) {
    results.innerHTML = '<div class="msg">Complete date/time first.</div>';
    return;
  }

  const from = `${fromDate}T${fromTime}:00Z`;
  const to   = `${toDate}T${toTime}:59Z`;

  try {
    const modeOn = document.getElementById("modeSwitch").checked;
    let url = `${API}/api/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    if (modeOn) {
      const airports = document.getElementById("airportCodes")
        .value.toUpperCase().split(",").map(x => x.trim()).filter(Boolean);
      if (airports.length === 0) {
        results.innerHTML = '<div class="msg">Enter airport ICAOs.</div>';
        return;
      }
      url += `&airports=${airports.join(",")}`;
    } else {
      const dep = document.getElementById("dep").value.trim().toUpperCase();
      const arr = document.getElementById("arr").value.trim().toUpperCase();
      if (dep) url += `&dep=${dep}`;
      if (arr) url += `&arr=${arr}`;
      url += `&bidirectional=${document.getElementById("bidirectional").checked}`;
    }

    searchController = new AbortController();
    const res = await fetch(url, { signal: searchController.signal });
    if (!res.ok) throw new Error(`Search ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid search response");

    latestData = (data || []).map(r => ({ ...r, search_to: to }));
    latestDepFilter = document.getElementById("modeSwitch").checked ? null : document.getElementById("dep").value.trim().toUpperCase();
    latestArrFilter = document.getElementById("modeSwitch").checked ? null : document.getElementById("arr").value.trim().toUpperCase();
    applyFilter();

  } catch (err) {
    if (err.name === "AbortError") return;
    console.log(err);
    results.innerHTML = '<div class="msg">Query failed.</div>';
  }
}

/* ===============================
   SEARCH SUMMARY CARDS
================================= */
function updateSearchStats(rows, depFilter, arrFilter) {
  document.getElementById("statFlights").innerText = rows.length;
  document.getElementById("statPilots").innerText =
    new Set(rows.map(r => r.user_id).filter(Boolean)).size;

  // If only dep given, show most common arrival (not dep)
  // If only arr given, show most common departure (not arr)
  // If both or neither, show most common of each
  if (depFilter && !arrFilter) {
    document.getElementById("statDep").innerText = depFilter;
    document.getElementById("statArr").innerText = "-";
  } else if (arrFilter && !depFilter) {
    document.getElementById("statDep").innerText = "-";
    document.getElementById("statArr").innerText = arrFilter;
  } else {
    document.getElementById("statDep").innerText =
      getMostCommon(rows.map(r => r.departure).filter(Boolean));
    document.getElementById("statArr").innerText =
      getMostCommon(rows.map(r => r.arrival).filter(Boolean));
  }
}

function getMostCommon(arr) {
  if (!arr.length) return "-";
  const map = {};
  arr.forEach(x => { map[x] = (map[x] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0][0];
}

/* ===============================
   RENDER SEARCH
================================= */
function applyFilter() {
  const filtered = getFilteredSearchData();
  updateSearchStats(filtered, latestDepFilter, latestArrFilter);
  renderSearch(filtered);
}

function isCompletedFlight(flight) {
  const state = (flight.last_state || "").trim().toLowerCase();
  return flight.status === "landed"
    || Boolean(flight.landed_at)
    || state === "on blocks"
    || state === "landed";
}

function getFilteredSearchData() {
  const completedOnly = document.getElementById("completedOnly")?.checked;
  return completedOnly ? latestData.filter(isCompletedFlight) : latestData;
}

window.isCompletedFlight = isCompletedFlight;
window.getFilteredSearchData = getFilteredSearchData;

function renderSearch(rows) {
  const wrap = document.getElementById("results");

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty">No flights found.</div>`;
    return;
  }

  wrap.innerHTML = `
<table class="pro-table">
<thead>
<tr>
<th>Flight</th>
<th>Route</th>
<th>Connected</th>
<th>Status</th>
</tr>
</thead>
<tbody>
${rows.map(r => {

  const connected = r.connected_at
    ? new Date(r.connected_at).toISOString().replace("T"," ").slice(0,16)
    : "-";



  return `
<tr>
<td>
<div class="flight-box">
${sessionLink(r.session_id, r.callsign)}
<div class="subline">
<span class="aircraft-chip">${escapeHtml(r.aircraft_id || "-")}</span>
${r.is_circuit ? '<span class="aircraft-chip">CIRCUIT</span>' : ''}
${r.is_reconnect ? '<span class="aircraft-chip">RECONNECT</span>' : ''}
<span class="vid-chip">VID ${escapeHtml(r.user_id)}</span>
</div>
</div>
</td>
<td>
<div class="route-box">
<span>${escapeHtml(r.departure || "---")}</span>
<span class="arrow">→</span>
<span>${escapeHtml(r.arrival || "---")}</span>
</div>
</td>
<td>${connected}</td>
<td>${renderSearchStatus(r)}</td>
</tr>`;

}).join("")}
</tbody>
</table>`;
}

/* ===============================
   STATUS
================================= */
// สำหรับ search results (historical)
function renderSearchStatus(f) {
  const state = (f.last_state || "").trim().toLowerCase();
  if (state === "on blocks") return '<span class="badge green">ON BLOCKS</span>';
  if (state === "landed")    return '<span class="badge green">LANDED</span>';
  // ถ้า arrivalDistance < 3 NM = ถึงปลายทางแล้ว ถือว่า landed
  if (f.arrival_distance !== null && f.arrival_distance < 3) {
    return '<span class="badge green">ON BLOCKS</span>';
  }
  // offline แต่ไม่ถึงปลายทาง = MISSING
  if (state) return '<span class="badge red">MISSING</span>';
  return '<span class="badge red">OFFLINE</span>';
}

// สำหรับ live board (real-time)
function renderStatus(f) {
  const state = (f.last_state || f.state || "").trim().toLowerCase();
  if (state === "on blocks") return '<span class="badge green">ON BLOCKS</span>';
  if (state === "landed")    return '<span class="badge green">LANDED</span>';
  if (state === "ground")    return '<span class="badge blue">GROUND</span>';
  if (state === "departing") return '<span class="badge blue">DEPARTING</span>';
  if (state === "climbing")  return '<span class="badge cyan">CLIMBING</span>';
  if (state === "en route")  return '<span class="badge yellow">EN ROUTE</span>';
  if (state === "approach")  return '<span class="badge orange">APPROACH</span>';
  return '<span class="badge cyan">ONLINE</span>';
}

/* ===============================
   LIVE BOARD
================================= */
let livePage = 1;
const livePerPage = 5;
let liveData = [];

async function loadLiveBoard() {
  try {
    const res = await fetch(`${API}/api/live`);
    if (!res.ok) throw new Error(`Live Board ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid live board response");
    liveData = data;
    livePage = 1;
    renderLiveBoard();

    document.getElementById("liveUpdated").innerText =
      "Updated " + new Date().toUTCString().split(" ")[4] + " UTC";
  } catch (err) {
    console.log("Live Board Error:", err);
    document.getElementById("liveBoardTable").innerHTML =
      '<div class="msg">Failed to load live board.</div>';
  }
}

function renderLiveBoard() {
  const wrap = document.getElementById("liveBoardTable");
  if (!liveData.length) {
    document.getElementById("pilotCount").innerText = "0";
    wrap.innerHTML = '<div class="msg">No Thailand flights online.</div>';
    return;
  }

  document.getElementById("pilotCount").innerText = liveData.length;

  const totalPages = Math.ceil(liveData.length / livePerPage);
  const start = (livePage - 1) * livePerPage;
  const pageData = liveData.slice(start, start + livePerPage);

  wrap.innerHTML = `
<table class="pro-table">
<thead>
<tr>
<th>Flight</th>
<th>Route</th>
<th>Aircraft</th>
<th>State</th>
</tr>
</thead>
<tbody>
${pageData.map(r => `
<tr>
<td>
<div class="flight-box">
  <div style="display:flex;align-items:center;gap:10px;">
    ${r.logo ? `<img src="${escapeHtml(r.logo)}" style="width:28px;height:28px;object-fit:contain;border-radius:6px;" alt="">` : ''}
    ${sessionLink(r.session_id, r.callsign)}
  </div>
  <div class="subline">
    <span class="vid-chip">VID ${escapeHtml(r.user_id)}</span>
    ${r.rating ? `<span class="aircraft-chip">${escapeHtml(r.rating)}</span>` : ''}
  </div>
</div>
</td>
<td>
<div class="route-box">
  <span>${escapeHtml(r.departure || '---')}</span>
  <span class="arrow">→</span>
  <span>${escapeHtml(r.arrival || '---')}</span>
</div>
</td>
<td><span class="aircraft-chip">${escapeHtml(r.aircraft || '-')}</span></td>
<td>${renderStatus(r)}</td>
</tr>
`).join("")}
</tbody>
</table>

<div class="pagination">
  <button class="btn-ghost" onclick="changeLivePage(-1)" ${livePage === 1 ? 'disabled' : ''}>← Prev</button>
  <span>Page ${livePage} / ${totalPages} &nbsp;•&nbsp; ${liveData.length} flights</span>
  <button class="btn-ghost" onclick="changeLivePage(1)" ${livePage === totalPages ? 'disabled' : ''}>Next →</button>
</div>`;
}

function changeLivePage(dir) {
  const totalPages = Math.ceil(liveData.length / livePerPage);
  livePage = Math.max(1, Math.min(totalPages, livePage + dir));
  renderLiveBoard();
}

window.changeLivePage = changeLivePage;

/* ===============================
   LIVE ATC
================================= */
async function loadLiveAtc() {
  const wrap = document.getElementById("liveAtcTable");
  if (!wrap) return;

  try {
    const res  = await fetch(`${API}/api/live-atc`);
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) throw new Error(`Live ATC ${res.status}`);

    document.getElementById("atcCount").innerText = data.length;

    if (!data.length) {
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
${data.map(r => `
<tr>
<td>${sessionLink(r.session_id, r.callsign)}</td>
<td><span class="aircraft-chip">${escapeHtml(r.airport)}</span></td>
<td><span class="badge cyan">${escapeHtml(r.station)}</span></td>
<td><span class="badge blue">${escapeHtml(r.rating)}</span></td>
</tr>
`).join("")}
</tbody>
</table>`;

  } catch (err) {
    console.log("Live ATC Error:", err);
  }
}

/* ===============================
   DASHBOARD (pilots + ATC online only)
================================= */
async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/api/stats`);
    if (!res.ok) throw new Error(`Dashboard ${res.status}`);
    const data = await res.json();

    document.getElementById("dPilots").innerText  = data.pilots ?? "-";
    document.getElementById("dAtc").innerText     = data.atc    ?? "-";

    document.getElementById("lastUpdated").innerText =
      "Updated " + new Date().toUTCString().split(" ")[4] + " UTC";

  } catch (err) {
    console.log("Dashboard Error:", err);
  }
}

/* ===============================
   EVENT PANEL
================================= */
function closeEventPanel() {
  const panel = document.getElementById("eventPanel");
  if (panel) panel.style.display = "none";
}

async function loadEventPanel() {
  const wrap = document.getElementById("eventPanelList");
  if (!wrap) return;

  try {
    const res  = await fetch(`${API}/api/events`);
    if (!res.ok) throw new Error(`Events ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid events response");

    const onlineDay = `
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

    const events = data.map(e => {
      const start   = new Date(e.startDate);
      const dateStr = start.toUTCString().slice(0,16);
      const timeStr = start.toUTCString().split(' ')[4].slice(0,5) + ' UTC';
      const imageUrl = safeExternalUrl(e.imageUrl);
      const infoUrl = safeExternalUrl(e.infoUrl);
      return `
      <div class="event-panel-card">
        ${imageUrl
          ? `<img class="event-panel-banner" src="${escapeHtml(imageUrl)}" onerror="this.style.display='none'" alt="">`
          : `<img class="event-panel-banner" src="https://storage.th.ivao.aero/EVENTS/utilities/Division%20Online%20Day.png" alt="">`}
        <div class="event-panel-body">
          <div class="event-panel-title">${escapeHtml(e.title)}</div>
          <div class="event-panel-meta">${dateStr} • ${timeStr}</div>
          <div class="event-panel-airports">
            ${(e.airports || []).slice(0,3).map(a => `<span>${escapeHtml(a)}</span>`).join('')}
          </div>
          ${infoUrl ? `<a href="${escapeHtml(infoUrl)}" target="_blank" rel="noopener noreferrer" class="event-panel-link">Forum →</a>` : ''}
        </div>
      </div>`;
    }).join('');

    const panel = document.getElementById("eventPanel");
    if (data.length === 0) {
      wrap.innerHTML = onlineDay;
    } else {
      wrap.innerHTML = onlineDay + events;
      if (panel) panel.style.display = "flex";
    }

  } catch (err) {
    console.log("Event Panel Error:", err);
  }
}

/* ===============================
   NAV
================================= */
function goToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

window.addEventListener("scroll", () => {
  const btn = document.getElementById("topBtn");
  if (window.scrollY > 400) btn.classList.add("show");
  else btn.classList.remove("show");
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===============================
   EXPORT CSV
================================= */
function exportCSV() {
  const exportData = getFilteredSearchData();
  if (!exportData.length) {
    alert("No search results to export.");
    return;
  }

  const rows = [["Callsign","VID","Aircraft","Departure","Arrival","Connected","Status"]];

  exportData.forEach(f => {
    rows.push([
      f.callsign || "", f.user_id || "", f.aircraft_id || "",
      f.departure || "", f.arrival || "", f.connected_at || "",
      getDisplayState(f)
    ]);
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ivao-search-" + new Date().toISOString().slice(0,19).replace(/:/g,"-") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getDisplayState(f) {
  const state = (f.last_state || "").trim();
  if (f.landed_at) return "LANDED";
  if (f.status === "offline") return "OFFLINE";
  if (!state) return "ONLINE";
  return state.toUpperCase();
}

/* ===============================
   SESSION MODAL
================================= */
async function openSession(sessionId, callsign) {
  const modal = document.getElementById("sessionModal");
  const body  = document.getElementById("sessionBody");
  document.getElementById("sessionTitle").innerText = callsign;
  body.innerHTML = '<div class="msg">Loading...</div>';
  modal.style.display = "flex";

  try {
    cancelSessionRequests();
    sessionController = new AbortController();
    const res  = await fetch(`${API}/api/session?id=${encodeURIComponent(sessionId)}`, {
      signal: sessionController.signal
    });
    if (!res.ok) throw new Error(`Session ${res.status}`);
    const d    = await res.json();

    const formatAlt = a => a ? `${a.toLocaleString()} ft` : "-";
    const formatSpd = s => s ? `${s} kts` : "-";

    body.innerHTML = `
<div class="session-grid">
  <div class="session-block">
    <small>Pilot</small>
    <div class="session-val">${escapeHtml(d.name || 'VID ' + d.user_id)}</div>
    <div class="subline" style="margin-top:4px">
      <span class="aircraft-chip">${escapeHtml(d.pilot_rating || '-')}</span>
      <span class="vid-chip">${escapeHtml(d.division || '')}</span>
      <span class="vid-chip">VID ${escapeHtml(d.user_id)}</span>
    </div>
  </div>
  <div class="session-block">
    <small>Simulator</small>
    <div class="session-val">${escapeHtml(d.simulator || '-')}</div>
  </div>
  <div class="session-block">
    <small>Route</small>
    <div class="route-box" style="font-size:20px;font-weight:800;">
      <span>${escapeHtml(d.departure || '---')}</span>
      <span class="arrow">→</span>
      <span>${escapeHtml(d.arrival || '---')}</span>
    </div>
  </div>
  <div class="session-block">
    <small>Aircraft</small>
    <div class="session-val">${escapeHtml(d.aircraft || '-')}</div>
  </div>
  <div class="session-block">
    <small>Altitude</small>
    <div class="session-val">${formatAlt(d.altitude)}</div>
  </div>
  <div class="session-block">
    <small>Ground Speed</small>
    <div class="session-val">${formatSpd(d.ground_speed)}</div>
  </div>
  <div class="session-block">
    <small>Heading</small>
    <div class="session-val">${d.heading ? d.heading + '°' : '-'}</div>
  </div>
  <div class="session-block">
    <small>State</small>
    <div>${d.state ? `<span class="badge cyan">${escapeHtml(d.state)}</span>` : '-'}</div>
  </div>
  ${d.cruise_altitude ? `<div class="session-block"><small>Planned Altitude</small><div class="session-val">${escapeHtml(d.cruise_altitude)}</div></div>` : ''}
  ${d.cruise_speed    ? `<div class="session-block"><small>Planned Speed</small><div class="session-val">${escapeHtml(d.cruise_speed)}</div></div>` : ''}
</div>
${d.route ? `
<div class="session-route">
  <small>Route</small>
  <div class="route-text">${escapeHtml(d.route)}</div>
</div>` : ''}
${d.remarks ? `
<div class="session-route">
  <small>Remarks</small>
  <div class="route-text" style="font-size:11px;opacity:.7">${escapeHtml(d.remarks)}</div>
</div>` : ''}
<div style="margin-top:18px;text-align:right">
  <a href="https://tracker.ivao.aero/sessions/${encodeURIComponent(d.session_id)}" target="_blank" rel="noopener noreferrer" class="btn-main" style="text-decoration:none;padding:10px 18px;border-radius:12px;font-size:13px;">
    Open in IVAO Tracker →
  </a>
</div>`;
  } catch (err) {
    if (err.name === "AbortError") return;
    body.innerHTML = '<div class="msg">Failed to load session.</div>';
  }
}

function closeSession() {
  cancelSessionRequests();
  document.getElementById("sessionModal").style.display = "none";
}

window.openSession  = openSession;
window.closeSession = closeSession;

/* ===============================
   START
================================= */
loadDashboard();
loadLiveBoard();
loadEventPanel();

window.closeEventPanel = closeEventPanel;

window.loadLiveAtc = loadLiveAtc;

setInterval(loadLiveBoard, 300000);
setInterval(loadDashboard, 600000);

window.searchFlights = searchFlights;
window.exportCSV     = exportCSV;
window.resetForm     = resetForm;
window.toggleMode    = toggleMode;
window.goToSection   = goToSection;
window.scrollToTop   = scrollToTop;

document.addEventListener("click", event => {
  const link = event.target.closest(".js-session-link");
  if (!link) return;
  event.preventDefault();
  openSession(link.dataset.sessionId, link.dataset.callsign);
});

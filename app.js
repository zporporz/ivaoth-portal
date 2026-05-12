/* ===============================
   IVAO THAILAND PORTAL - APP.JS
================================= */

const API = "";

let latestData = [];

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
    }

    const res = await fetch(url);
    const data = await res.json();

    latestData = (data || []).map(r => ({ ...r, search_to: to }));
    const depVal = document.getElementById("modeSwitch").checked ? null : document.getElementById("dep").value.trim().toUpperCase();
    const arrVal = document.getElementById("modeSwitch").checked ? null : document.getElementById("arr").value.trim().toUpperCase();
    updateSearchStats(latestData, depVal, arrVal);
    renderSearch(latestData);

  } catch (err) {
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
<th>Duration</th>
<th>Status</th>
</tr>
</thead>
<tbody>
${rows.map(r => {

  const connected = r.connected_at
    ? new Date(r.connected_at).toISOString().replace("T"," ").slice(0,16)
    : "-";

  let duration = "-";
  if (r.duration_sec && r.duration_sec > 0 && r.duration_sec < 86400) {
    const h = Math.floor(r.duration_sec / 3600);
    const m = Math.floor((r.duration_sec % 3600) / 60);
    duration = h + "h " + m + "m";
  }

  return `
<tr>
<td>
<div class="flight-box">
<a href="https://tracker.ivao.aero/sessions/${r.session_id}" target="_blank" class="trk-link">${r.callsign}</a>
<div class="subline">
<span class="aircraft-chip">${r.aircraft_id || "-"}</span>
<span class="vid-chip">VID ${r.user_id}</span>
</div>
</div>
</td>
<td>
<div class="route-box">
<span>${r.departure || "---"}</span>
<span class="arrow">→</span>
<span>${r.arrival || "---"}</span>
</div>
</td>
<td>${connected}</td>
<td><span class="time-chip">${duration}</span></td>
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
  // offline = disconnect ไปแล้ว ถ้ายังไม่ลง = MISSING
  if (state && state !== "on blocks" && state !== "landed") {
    return '<span class="badge red">MISSING</span>';
  }
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
    liveData = await res.json();
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
    ${r.logo ? `<img src="${r.logo}" style="width:28px;height:28px;object-fit:contain;border-radius:6px;">` : ''}
    <a href="https://tracker.ivao.aero/sessions/${r.session_id}" target="_blank" class="trk-link">${r.callsign}</a>
  </div>
  <div class="subline">
    <span class="vid-chip">VID ${r.user_id}</span>
    ${r.rating ? `<span class="aircraft-chip">${r.rating}</span>` : ''}
  </div>
</div>
</td>
<td>
<div class="route-box">
  <span>${r.departure || '---'}</span>
  <span class="arrow">→</span>
  <span>${r.arrival || '---'}</span>
</div>
</td>
<td><span class="aircraft-chip">${r.aircraft || '-'}</span></td>
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
<td><a href="https://tracker.ivao.aero/sessions/${r.session_id}" target="_blank" class="trk-link">${r.callsign}</a></td>
<td><span class="aircraft-chip">${r.airport}</span></td>
<td><span class="badge cyan">${r.station}</span></td>
<td><span class="badge blue">${r.rating}</span></td>
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
    const data = await res.json();

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
      return `
      <div class="event-panel-card">
        ${e.imageUrl
          ? `<img class="event-panel-banner" src="${e.imageUrl}" onerror="this.style.display='none'" alt="">`
          : `<img class="event-panel-banner" src="https://storage.th.ivao.aero/EVENTS/utilities/Division%20Online%20Day.png" alt="">`}
        <div class="event-panel-body">
          <div class="event-panel-title">${e.title}</div>
          <div class="event-panel-meta">${dateStr} • ${timeStr}</div>
          <div class="event-panel-airports">
            ${(e.airports || []).slice(0,3).map(a => `<span>${a}</span>`).join('')}
          </div>
          ${e.infoUrl ? `<a href="${e.infoUrl}" target="_blank" class="event-panel-link">Forum →</a>` : ''}
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
  if (!latestData || !latestData.length) {
    alert("No search results to export.");
    return;
  }

  const rows = [["Callsign","VID","Aircraft","Departure","Arrival","Connected","Status"]];

  latestData.forEach(f => {
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
   START
================================= */
loadDashboard();
loadLiveBoard();
loadLiveAtc();
loadEventPanel();

window.closeEventPanel = closeEventPanel;

setInterval(loadLiveAtc, 300000);
window.loadLiveAtc = loadLiveAtc;

setInterval(loadLiveBoard, 300000);
setInterval(loadDashboard, 600000);

window.searchFlights = searchFlights;
window.exportCSV     = exportCSV;
window.resetForm     = resetForm;
window.toggleMode    = toggleMode;
window.goToSection   = goToSection;
window.scrollToTop   = scrollToTop;
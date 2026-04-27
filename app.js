/* ===============================
   IVAO THAILAND PORTAL - APP.JS
   Search + Statistics via API VM
================================= */

const API = "";

let latestData = [];
let depChart = null;
let arrChart = null;

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
  results.innerHTML = '<div class="msg">Searching database...</div>';
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

    latestData = data || [];
    updateSearchStats(latestData);
    renderSearch(latestData);

  } catch (err) {
    console.log(err);
    results.innerHTML = '<div class="msg">Database query failed.</div>';
  }
}

/* ===============================
   SEARCH SUMMARY CARDS
================================= */
function updateSearchStats(rows) {
  document.getElementById("statFlights").innerText = rows.length;
  document.getElementById("statPilots").innerText =
    new Set(rows.map(r => r.user_id).filter(Boolean)).size;
  document.getElementById("statDep").innerText =
    getMostCommon(rows.map(r => r.departure).filter(Boolean));
  document.getElementById("statArr").innerText =
    getMostCommon(rows.map(r => r.arrival).filter(Boolean));
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
  if (r.connected_at) {
    const mins = Math.floor((Date.now() - new Date(r.connected_at)) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
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
<td>${renderStatus(r)}</td>
</tr>`;

}).join("")}
</tbody>
</table>`;
}

/* ===============================
   STATUS
================================= */
function renderStatus(f) {
  const state = (f.last_state || f.state || "").trim().toLowerCase();
  if (f.landed_at)          return '<span class="badge green">LANDED</span>';
  if (state === "landed")   return '<span class="badge green">LANDED</span>';
  if (f.status === "offline") return '<span class="badge red">MISSING</span>';
  if (state === "ground")   return '<span class="badge blue">GROUND</span>';
  if (state === "departing") return '<span class="badge blue">DEPARTING</span>';
  if (state === "climbing") return '<span class="badge cyan">CLIMBING</span>';
  if (state === "en route") return '<span class="badge yellow">EN ROUTE</span>';
  if (state === "approach") return '<span class="badge orange">APPROACH</span>';
  return '<span class="badge blue">ONLINE</span>';
}

/* ===============================
   DASHBOARD
================================= */
const centerTextPlugin = {
  id: "centerTextPlugin",
  beforeDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    if (!meta.data.length) return;
    const { ctx } = chart;
    const x = meta.data[0].x;
    const y = meta.data[0].y;
    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px Inter";
    ctx.fillText(total, x, y);
    ctx.restore();
  }
};

/* ===============================
   LIVE BOARD
================================= */
async function loadLiveBoard() {
  const wrap = document.getElementById("liveBoardTable");
  if (!wrap) return;
  wrap.innerHTML = '<div class="msg">Loading live traffic...</div>';

  try {
    const res  = await fetch(`${API}/api/live`);
    const data = await res.json();

    if (!data.length) {
      wrap.innerHTML = '<div class="msg">No Thailand flights online.</div>';
      return;
    }

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
${data.map(r => `
<tr>
<td>
<div class="flight-box">
  <div style="display:flex;align-items:center;gap:10px;">
    ${r.logo ? `<img src="${r.logo}" style="width:28px;height:28px;object-fit:contain;border-radius:6px;">` : ''}
    <a href="https://tracker.ivao.aero/sessions/${r.session_id}" target="_blank" class="trk-link">${r.callsign}</a>
  </div>
  <div class="subline">
    <span class="vid-chip">VID ${r.user_id}</span>
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
</table>`;

  } catch (err) {
    console.log("Live Board Error:", err);
    wrap.innerHTML = '<div class="msg">Failed to load live board.</div>';
  }
}

async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/api/stats`);
    const data = await res.json();

    document.getElementById("dPilots").innerText  = data.pilots  || 0;
    document.getElementById("dAtc").innerText     = data.atc     || 0;
    document.getElementById("dLanded").innerText  = data.landed  || 0;
    document.getElementById("dMissing").innerText = data.missing || 0;

    document.getElementById("lastUpdated").innerText =
      "Updated " + new Date().toUTCString().split(" ")[4] + " UTC";

    const depLabels = data.topDepartures.map(x => x.airport);
    const depData   = data.topDepartures.map(x => parseInt(x.total));
    const arrLabels = data.topArrivals.map(x => x.airport);
    const arrData   = data.topArrivals.map(x => parseInt(x.total));

    if (depChart) depChart.destroy();
    if (arrChart) arrChart.destroy();

    depChart = new Chart(document.getElementById("topDeps"), {
      type: "doughnut",
      data: { labels: depLabels, datasets: [{ data: depData, borderWidth: 0 }] },
      plugins: [centerTextPlugin],
      options: { cutout: "68%", plugins: { legend: { position: "bottom", labels: { color: "#fff" } } } }
    });

    arrChart = new Chart(document.getElementById("topArrs"), {
      type: "doughnut",
      data: { labels: arrLabels, datasets: [{ data: arrData, borderWidth: 0 }] },
      plugins: [centerTextPlugin],
      options: { cutout: "68%", plugins: { legend: { position: "bottom", labels: { color: "#fff" } } } }
    });

  } catch (err) {
    console.log("Dashboard Error:", err);
  }
}

/* ===============================
   SNAPSHOT SECTION
================================= */
let trendChart = null;

async function loadSnapshot() {
  await loadTopAirlines();
  await loadTrafficTrend();
  document.getElementById("snapshotUpdated").innerText =
    "Updated " + new Date().toUTCString().split(" ")[4] + " UTC";
}

/* ===============================
   TOP AIRLINES (7D)
================================= */
async function loadTopAirlines() {
  try {
    const res  = await fetch(`${API}/api/top-airlines`);
    const data = await res.json();

    const wrap = document.getElementById("topAirlinesList");
    if (!data || !data.length) { wrap.innerHTML = "No data"; return; }

    wrap.innerHTML = data.map((x, i) => `
      <div class="airline-row">
        <div class="airline-rank">#${i + 1}</div>
        <img class="airline-logo" 
          src="${x.logo || ''}" 
          onerror="this.style.display='none'"
          alt="${x.airline}">
        <div class="airline-info">
          <div class="airline-code">${x.airline}</div>
          ${x.name ? `<div class="airline-name">${x.name}</div>` : ''}
        </div>
        <div class="airline-count">${x.total}</div>
      </div>
    `).join("");

  } catch (err) {
    console.log("Top Airlines Error:", err);
  }
}

/* ===============================
   TRAFFIC TREND (24H)
================================= */
async function loadTrafficTrend() {
  try {
    const res  = await fetch(`${API}/api/trend`);
    const rows = await res.json();

    const buckets = Array(24).fill(0);
    rows.forEach(row => {
      buckets[parseInt(row.hour)] = parseInt(row.total);
    });

    const labels = [
      "00Z","01Z","02Z","03Z","04Z","05Z",
      "06Z","07Z","08Z","09Z","10Z","11Z",
      "12Z","13Z","14Z","15Z","16Z","17Z",
      "18Z","19Z","20Z","21Z","22Z","23Z"
    ];

    const peak = Math.max(...buckets);
    if (trendChart) trendChart.destroy();

    const canvas = document.getElementById("trendChart");
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 420);
    gradient.addColorStop(0,   "rgba(0,255,255,.45)");
    gradient.addColorStop(.35, "rgba(0,140,255,.28)");
    gradient.addColorStop(.7,  "rgba(140,0,255,.12)");
    gradient.addColorStop(1,   "rgba(0,0,0,0)");

    trendChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: buckets,
          borderColor: "#00eaff",
          backgroundColor: gradient,
          fill: true,
          tension: .42,
          borderWidth: 4,
          pointRadius: buckets.map(v => v === peak ? 6 : 3),
          pointHoverRadius: 7,
          pointBackgroundColor: buckets.map(v => v === peak ? "#ffd54f" : "#7cf7ff"),
          pointBorderColor: buckets.map(v => v === peak ? "#ffffff" : "#00eaff"),
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#091224",
            borderColor: "#00eaff",
            borderWidth: 1,
            titleColor: "#ffffff",
            bodyColor: "#9fe8ff",
            padding: 12,
            displayColors: false,
            callbacks: { label: ctx => ctx.raw + " flights" }
          }
        },
        scales: {
          x: { ticks: { color: "#9db5d8" }, grid: { color: "rgba(255,255,255,.035)" } },
          y: { beginAtZero: true, ticks: { color: "#9db5d8" }, grid: { color: "rgba(255,255,255,.04)" } }
        },
        interaction: { intersect: false, mode: "index" }
      }
    });

  } catch (err) {
    console.log("Trend Error:", err);
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

  const rows = [["Callsign","VID","Aircraft","Departure","Arrival","Connected","Departed","Landed","Status","State"]];

  latestData.forEach(f => {
    rows.push([
      f.callsign || "", f.user_id || "", f.aircraft_id || "",
      f.departure || "", f.arrival || "", f.connected_at || "",
      f.departed_at || "", f.landed_at || "",
      getDisplayState(f), getDisplayState(f)
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
  if (f.status === "offline") return "MISSING";
  if (!state) return "ONLINE";
  return state.toUpperCase();
}

/* ===============================
   START
================================= */
loadDashboard();
loadSnapshot();
loadLiveBoard();

setInterval(loadLiveBoard, 60000);
setInterval(loadDashboard, 600000);
setInterval(loadSnapshot, 600000);

window.searchFlights = searchFlights;
window.exportCSV     = exportCSV;
window.resetForm     = resetForm;
window.toggleMode    = toggleMode;
window.goToSection   = goToSection;
window.scrollToTop   = scrollToTop;
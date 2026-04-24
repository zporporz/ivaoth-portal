/* ===============================
   IVAO THAILAND PORTAL - APP.JS FINAL
   Search + Statistics via Supabase
================================= */

const SUPABASE_URL =
  "https://ifpseicrhxoujcykrigd.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_49ThdVhLCpBBpga6LZtnNQ_HmhH2Emj";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let latestData = [];
let depChart = null;
let arrChart = null;

/* ===============================
   UI MODE
================================= */
function toggleMode() {
  const on = document.getElementById("modeSwitch").checked;

  document.getElementById("airportWrap").style.display =
    on ? "block" : "none";

  document.getElementById("depWrap").style.display =
    on ? "none" : "block";

  document.getElementById("arrWrap").style.display =
    on ? "none" : "block";

  document.getElementById("bidiWrap").style.display =
    on ? "none" : "flex";
}

toggleMode();

/* ===============================
   RESET
================================= */
function resetForm() {
  [
    "airportCodes",
    "dep",
    "arr",
    "fromDate",
    "fromTime",
    "toDate",
    "toTime"
  ].forEach(id => {
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

  results.innerHTML =
    '<div class="msg">Searching database...</div>';

  document.getElementById("resultSection").style.display =
    "block";

  const fromDate =
    document.getElementById("fromDate").value;

  const fromTime =
    document.getElementById("fromTime").value;

  const toDate =
    document.getElementById("toDate").value;

  const toTime =
    document.getElementById("toTime").value;

  if (!fromDate || !fromTime || !toDate || !toTime) {
    results.innerHTML =
      '<div class="msg">Complete date/time first.</div>';
    return;
  }

  const from = `${fromDate}T${fromTime}:00Z`;
  const to = `${toDate}T${toTime}:59Z`;

  try {
    let query = db
      .from("pilot_sessions")
      .select("*")
      .gte("connected_at", from)
      .lte("connected_at", to)
      .order("connected_at", { ascending: false })
      .limit(500);

    const modeOn =
      document.getElementById("modeSwitch").checked;

    if (modeOn) {
      const airports = document
        .getElementById("airportCodes")
        .value.toUpperCase()
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

      if (airports.length === 0) {
        results.innerHTML =
          '<div class="msg">Enter airport ICAOs.</div>';
        return;
      }

      query = query.or(
        airports
          .map(
            x =>
              `departure.eq.${x},arrival.eq.${x}`
          )
          .join(",")
      );
    } else {
      const dep = document
        .getElementById("dep")
        .value.trim()
        .toUpperCase();

      const arr = document
        .getElementById("arr")
        .value.trim()
        .toUpperCase();

      if (dep) query = query.eq("departure", dep);
      if (arr) query = query.eq("arrival", arr);
    }

    const { data, error } = await query;

    if (error) throw error;

    latestData = data || [];

    updateSearchStats(latestData);
    renderSearch(latestData);

  } catch (err) {
    console.log(err);

    results.innerHTML =
      '<div class="msg">Database query failed.</div>';
  }
}

/* ===============================
   SEARCH SUMMARY CARDS
================================= */
function updateSearchStats(rows) {
  document.getElementById("statFlights").innerText =
    rows.length;

  document.getElementById("statPilots").innerText =
    new Set(
      rows.map(r => r.user_id).filter(Boolean)
    ).size;

  document.getElementById("statDep").innerText =
    getMostCommon(
      rows.map(r => r.departure).filter(Boolean)
    );

  document.getElementById("statArr").innerText =
    getMostCommon(
      rows.map(r => r.arrival).filter(Boolean)
    );
}

function getMostCommon(arr) {
  if (!arr.length) return "-";

  const map = {};

  arr.forEach(x => {
    map[x] = (map[x] || 0) + 1;
  });

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])[0][0];
}

/* ===============================
   RENDER SEARCH
================================= */
function renderSearch(rows) {
  const wrap = document.getElementById("results");

  if (!rows.length) {
    wrap.innerHTML =
      `<div class="empty">No flights found.</div>`;
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
 ? new Date(r.connected_at)
   .toISOString()
   .replace("T"," ")
   .slice(0,16)
 : "-";

let duration = "-";

if (r.connected_at) {
 const mins = Math.floor(
   (Date.now() - new Date(r.connected_at)) / 60000
 );

 const h = Math.floor(mins / 60);
 const m = mins % 60;

 duration = h + "h " + m + "m";
}

return `
<tr>

<td>
<div class="flight-box">

<a href="https://tracker.ivao.aero/sessions/${r.session_id}"
target="_blank"
class="trk-link">
${r.callsign}
</a>

<div class="subline">
<span class="aircraft-chip">
${r.aircraft_id || "-"}
</span>

<span class="vid-chip">
VID ${r.user_id}
</span>
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

<td>
<span class="time-chip">${duration}</span>
</td>

<td>
${renderStatus(r)}
</td>

</tr>
`;

}).join("")}
</tbody>
</table>
`;
}

/* ===============================
   STATUS
================================= */
function renderStatus(f){

 const state =
   (f.last_state || "")
   .trim()
   .toLowerCase();

 if (f.landed_at) {
   return '<span class="badge green">LANDED</span>';
 }

 if (state === "landed") {
   return '<span class="badge green">LANDED</span>';
 }

 if (f.status === "offline") {
   return '<span class="badge red">MISSING</span>';
 }

 if (state === "ground") {
   return '<span class="badge blue">GROUND</span>';
 }

 if (state === "departing") {
   return '<span class="badge blue">DEPARTING</span>';
 }

 if (state === "climbing") {
   return '<span class="badge cyan">CLIMBING</span>';
 }

 if (state === "en route") {
   return '<span class="badge yellow">EN ROUTE</span>';
 }

 if (state === "approach") {
   return '<span class="badge orange">APPROACH</span>';
 }

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

    const total =
      chart.data.datasets[0].data.reduce(
        (a, b) => a + b,
        0
      );

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px Inter";
    ctx.fillText(total, x, y);
    ctx.restore();
  }
};

async function loadDashboard() {
  try {
    const week =
      new Date(
        Date.now() - 7 * 86400000
      ).toISOString();

    const { count: pilots } = await db
      .from("pilot_sessions")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("status", "online")
      .or(
        "departure.like.VT%,arrival.like.VT%"
      );

    const { count: atc } = await db
      .from("atc_sessions")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("status", "online")
      .like("callsign", "VT%");

    const { count: landed } = await db
      .from("pilot_sessions")
      .select("*", {
        count: "exact",
        head: true
      })
      .gte("connected_at", week)
      .or(
        "departure.like.VT%,arrival.like.VT%"
      )
      .not("landed_at", "is", null);

    const { count: missing } = await db
      .from("pilot_sessions")
      .select("*", {
        count: "exact",
        head: true
      })
      .gte("connected_at", week)
      .eq("status", "offline")
      .is("landed_at", null)
      .or(
        "departure.like.VT%,arrival.like.VT%"
      );

    document.getElementById("dPilots").innerText =
      pilots || 0;

    document.getElementById("dAtc").innerText =
      atc || 0;

    document.getElementById("dLanded").innerText =
      landed || 0;

    document.getElementById("dMissing").innerText =
      missing || 0;

    document.getElementById("lastUpdated").innerText =
      "Updated " +
      new Date()
      .toUTCString()
      .split(" ")[4] +
      " UTC";

    const { data: deps } = await db
      .from("pilot_sessions")
      .select("departure")
      .gte("connected_at", week)
      .like("departure", "VT%")
      .not("departure", "is", null)
      .limit(500);

    const depMap = {};

    (deps || []).forEach(x => {
      depMap[x.departure] =
        (depMap[x.departure] || 0) + 1;
    });

    const depSorted =
      Object.entries(depMap)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,6);

    const depLabels =
      depSorted.map(x => x[0]);

    const depData =
      depSorted.map(x => x[1]);

    const { data: arrs } = await db
      .from("pilot_sessions")
      .select("arrival")
      .gte("connected_at", week)
      .like("arrival", "VT%")
      .not("arrival", "is", null)
      .limit(500);

    const arrMap = {};

    (arrs || []).forEach(x => {
      arrMap[x.arrival] =
        (arrMap[x.arrival] || 0) + 1;
    });

    const arrSorted =
      Object.entries(arrMap)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,6);

    const arrLabels =
      arrSorted.map(x => x[0]);

    const arrData =
      arrSorted.map(x => x[1]);

    if (depChart) depChart.destroy();
    if (arrChart) arrChart.destroy();

    depChart = new Chart(
      document.getElementById("topDeps"),
      {
        type: "doughnut",
        data: {
          labels: depLabels,
          datasets: [{
            data: depData,
            borderWidth: 0
          }]
        },
        plugins: [centerTextPlugin],
        options: {
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color:"#fff" }
            }
          }
        }
      }
    );

    arrChart = new Chart(
      document.getElementById("topArrs"),
      {
        type: "doughnut",
        data: {
          labels: arrLabels,
          datasets: [{
            data: arrData,
            borderWidth: 0
          }]
        },
        plugins: [centerTextPlugin],
        options: {
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color:"#fff" }
            }
          }
        }
      }
    );

  } catch (err) {
    console.log("Dashboard Error:", err);
  }
}

/* ===============================
   NAV
================================= */
function goToSection(id) {
  const el =
    document.getElementById(id);

  if (el)
    el.scrollIntoView({
      behavior: "smooth"
    });
}

window.addEventListener("scroll", () => {
  const btn =
    document.getElementById("topBtn");

  if (window.scrollY > 400)
    btn.classList.add("show");
  else
    btn.classList.remove("show");
});

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* ===============================
   EXPORT CSV
================================= */
function exportCSV() {
  if (!latestData || !latestData.length) {
    alert("No search results to export.");
    return;
  }

  const rows = [[
    "Callsign",
    "VID",
    "Aircraft",
    "Departure",
    "Arrival",
    "Connected",
    "Departed",
    "Landed",
    "Status",
    "State"
  ]];

  latestData.forEach(f => {
    rows.push([
      f.callsign || "",
      f.user_id || "",
      f.aircraft_id || "",
      f.departure || "",
      f.arrival || "",
      f.connected_at || "",
      f.departed_at || "",
      f.landed_at || "",
      getDisplayState(f),
      getDisplayState(f)
    ]);
  });

  const csv = rows.map(r =>
    r.map(v =>
      `"${String(v)
      .replace(/"/g,'""')}"`
    ).join(",")
  ).join("\n");

  const blob = new Blob(
    [csv],
    {
      type:
      "text/csv;charset=utf-8;"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "ivao-search-" +
    new Date()
    .toISOString()
    .slice(0,19)
    .replace(/:/g,"-") +
    ".csv";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function getDisplayState(f) {
  const state =
    (f.last_state || "").trim();

  if (f.landed_at)
    return "LANDED";

  if (f.status === "offline")
    return "MISSING";

  if (!state)
    return "ONLINE";

  return state.toUpperCase();
}

/* ===============================
   START
================================= */
loadDashboard();
setInterval(loadDashboard, 300000);

window.searchFlights = searchFlights;
window.exportCSV = exportCSV;
window.resetForm = resetForm;
window.toggleMode = toggleMode;
window.goToSection = goToSection;
window.scrollToTop = scrollToTop;
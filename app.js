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

    renderSearch(latestData);
  } catch (err) {
    console.log(err);

    results.innerHTML =
      '<div class="msg">Database query failed.</div>';
  }
}

/* ===============================
   RENDER SEARCH
================================= */
function renderSearch(rows) {
  const results = document.getElementById("results");

  document.getElementById("statFlights").innerText =
    rows.length;

  document.getElementById("statPilots").innerText =
    new Set(rows.map(x => x.user_id)).size;

  document.getElementById("statDep").innerText =
    rows[0]?.departure || "-";

  document.getElementById("statArr").innerText =
    rows[0]?.arrival || "-";

  if (rows.length === 0) {
    results.innerHTML =
      '<div class="msg">No flights detected.</div>';
    return;
  }

  let html = `
  <table>
  <tr>
    <th>Callsign</th>
    <th>Aircraft</th>
    <th>VID</th>
    <th>Route</th>
    <th>Status</th>
  </tr>
  `;

  rows.forEach(f => {
    html += `
    <tr>
      <td>${f.callsign || "-"}</td>
      <td>${f.aircraft_id || "-"}</td>
      <td>${f.user_id || "-"}</td>
      <td>${f.departure || "-"} → ${f.arrival || "-"}</td>
      <td>${renderStatus(f)}</td>
    </tr>
    `;
  });

  html += `</table>`;

  results.innerHTML = html;
}

/* ===============================
   STATUS
================================= */
function renderStatus(f) {
  if (f.landed_at)
    return '<span class="badge green">Landed</span>';

  if (f.status === "offline")
    return '<span class="badge red">Offline</span>';

  const s =
    (f.last_state || "").toLowerCase();

  if (s.includes("air"))
    return '<span class="badge yellow">Enroute</span>';

  if (s.includes("taxi"))
    return '<span class="badge blue">Taxi</span>';

  return '<span class="badge blue">Online</span>';
}

/* ===============================
   CSV
================================= */
function exportCSV() {
  if (!latestData.length) {
    alert("No data.");
    return;
  }

  let csv =
    "Callsign,VID,Departure,Arrival,Aircraft,Status\n";

  latestData.forEach(f => {
    csv += [
      f.callsign,
      f.user_id,
      f.departure,
      f.arrival,
      f.aircraft_id,
      f.status
    ].join(",") + "\n";
  });

  const blob = new Blob([csv], {
    type: "text/csv"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ivao-search.csv";
  a.click();
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
      .eq("status", "online");

    const { count: atc } = await db
      .from("atc_sessions")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("status", "online");

    const { count: landed } = await db
      .from("pilot_sessions")
      .select("*", {
        count: "exact",
        head: true
      })
      .gte("landed_at", week);

    const { count: missing } = await db
      .from("pilot_sessions")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("status", "offline")
      .is("landed_at", null);

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
      .not("departure", "is", null)
      .limit(500);

    const depMap = {};
    deps.forEach(x => {
      depMap[x.departure] =
        (depMap[x.departure] || 0) + 1;
    });

    const depLabels = Object.keys(depMap).slice(0, 6);
    const depData = depLabels.map(
      x => depMap[x]
    );

    const { data: arrs } = await db
      .from("pilot_sessions")
      .select("arrival")
      .not("arrival", "is", null)
      .limit(500);

    const arrMap = {};
    arrs.forEach(x => {
      arrMap[x.arrival] =
        (arrMap[x.arrival] || 0) + 1;
    });

    const arrLabels = Object.keys(arrMap).slice(0, 6);
    const arrData = arrLabels.map(
      x => arrMap[x]
    );

    if (depChart) depChart.destroy();
    if (arrChart) arrChart.destroy();

    depChart = new Chart(
      document.getElementById("topDeps"),
      {
        type: "doughnut",
        data: {
          labels: depLabels,
          datasets: [
            {
              data: depData,
              borderWidth: 0
            }
          ]
        },
        plugins: [centerTextPlugin],
        options: {
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#fff" }
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
          datasets: [
            {
              data: arrData,
              borderWidth: 0
            }
          ]
        },
        plugins: [centerTextPlugin],
        options: {
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#fff" }
            }
          }
        }
      }
    );
  } catch (err) {
    console.log(err);
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
  else btn.classList.remove("show");
});

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
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
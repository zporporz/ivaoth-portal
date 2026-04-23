let latestData = [];

function toggleMode(){

const on = document.getElementById("modeSwitch").checked;

if(on){
document.getElementById("airportWrap").style.display = "block";
document.getElementById("depWrap").style.display = "none";
document.getElementById("arrWrap").style.display = "none";
document.getElementById("bidiWrap").style.display = "none";
}else{
document.getElementById("airportWrap").style.display = "none";
document.getElementById("depWrap").style.display = "block";
document.getElementById("arrWrap").style.display = "block";
document.getElementById("bidiWrap").style.display = "flex";
}

}

toggleMode();

function resetForm(){

[
"airportCodes",
"dep",
"arr",
"fromDate",
"fromTime",
"toDate",
"toTime"
].forEach(id=>{
const el = document.getElementById(id);
if(el) el.value = "";
});

latestData = [];

document.getElementById("results").innerHTML = "";
document.getElementById("resultSection").style.display = "none";

document.getElementById("statFlights").innerText = "0";
document.getElementById("statPilots").innerText = "0";
document.getElementById("statDep").innerText = "-";
document.getElementById("statArr").innerText = "-";

}

async function searchFlights(){

const results = document.getElementById("results");

results.innerHTML =
'<div class="msg">Searching database...</div>';

const modeOn = document.getElementById("modeSwitch").checked;

const fromDate = document.getElementById("fromDate").value;
const fromTime = document.getElementById("fromTime").value;
const toDate = document.getElementById("toDate").value;
const toTime = document.getElementById("toTime").value;

if(!fromDate || !fromTime || !toDate || !toTime){
results.innerHTML =
'<div class="msg">Complete date/time first.</div>';
return;
}

document.getElementById("resultSection").style.display = "block";

const from = `${fromDate}T${fromTime}:00.000Z`;
const to   = `${toDate}T${toTime}:59.000Z`;

let allData = [];

try{

if(modeOn){

const airports = document.getElementById("airportCodes").value
.toUpperCase()
.split(",")
.map(x=>x.trim())
.filter(Boolean);

if(airports.length===0){
results.innerHTML =
'<div class="msg">Enter airport ICAOs.</div>';
return;
}

for(const code of airports){

const r1 = await fetch(
`https://ivaoth-bot.fly.dev/api/search?dep=${code}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
);
const d1 = await r1.json();

const r2 = await fetch(
`https://ivaoth-bot.fly.dev/api/search?arr=${code}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
);
const d2 = await r2.json();

allData = allData.concat(d1,d2);

}

}else{

const dep = document.getElementById("dep").value.trim().toUpperCase();
const arr = document.getElementById("arr").value.trim().toUpperCase();

if(!dep && !arr){
results.innerHTML =
'<div class="msg">Enter departure or arrival ICAO.</div>';
return;
}

const r = await fetch(
`https://ivaoth-bot.fly.dev/api/search?dep=${dep}&arr=${arr}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
);

allData = await r.json();

if(document.getElementById("bidirectional").checked && dep && arr){

const r2 = await fetch(
`https://ivaoth-bot.fly.dev/api/search?dep=${arr}&arr=${dep}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
);

const d2 = await r2.json();

allData = allData.concat(d2);

}

}

/* remove duplicates */
const map = new Map();
allData.forEach(x => map.set(x.track_id, x));
allData = [...map.values()];

latestData = allData;

document.getElementById("statFlights").innerText = allData.length;
document.getElementById("statPilots").innerText =
new Set(allData.map(x=>x.vid)).size;

document.getElementById("statDep").innerText =
allData[0]?.dep || "-";

document.getElementById("statArr").innerText =
allData[0]?.arr || "-";

if(allData.length===0){
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
<th>Track</th>
</tr>
`;

allData.forEach(f=>{

html += `
<tr>
<td>${f.callsign}</td>
<td>${f.aircraft}</td>
<td>${f.vid}</td>
<td>${f.dep} → ${f.arr}</td>
<td>${renderStatus(f)}</td>
<td>
<a class="track"
href="https://tracker.ivao.aero/sessions/${f.track_id}"
target="_blank">
#${f.track_id}
</a>
</td>
</tr>
`;

});

html += `</table>`;

results.innerHTML = html;

}catch(e){

results.innerHTML =
'<div class="msg">API connection failed.</div>';

}

}

function exportCSV(){

if(latestData.length === 0){
alert("No data to export.");
return;
}

let csv =
"Track ID,Callsign,VID,Departure,Arrival,Aircraft,Status,Search Time UTC\n";

latestData.forEach(f=>{

csv += [
cleanCSV(f.track_id || ""),
cleanCSV(f.callsign || ""),
cleanCSV(f.vid || ""),
cleanCSV(f.dep || ""),
cleanCSV(f.arr || ""),
cleanCSV(f.aircraft || ""),
cleanCSV(getStatusText(f)),
cleanCSV(f.time || "")
].join(",") + "\n";

});

const blob = new Blob([csv], {
type:"text/csv;charset=utf-8;"
});

const url = URL.createObjectURL(blob);

const a = document.createElement("a");
a.href = url;

const now = new Date();

a.download =
`ivao-search-${now.getUTCFullYear()}-${
String(now.getUTCMonth()+1).padStart(2,"0")
}-${
String(now.getUTCDate()).padStart(2,"0")
}.csv`;

a.click();

URL.revokeObjectURL(url);

}

function cleanCSV(value){
return `"${String(value).replace(/"/g,'""')}"`;
}

function getStatusText(f){

const status = (f.status || "").toLowerCase();

if(f.landed_at){
return "Landed";
}

if(status === "offline"){
return "Missing";
}

const state = (f.last_state || "").toLowerCase();

if(state.includes("route")) return "Enroute";
if(state.includes("approach")) return "Approach";
if(state.includes("boarding")) return "Boarding";
if(state.includes("taxi")) return "Taxiing";
if(state.includes("push")) return "Pushback";
if(state.includes("block")) return "On Blocks";

if(f.last_state) return f.last_state;

return "Online";

}

function renderStatus(f){

const status = (f.status || "").toLowerCase();

if(f.landed_at){
return '<span class="badge green">Landed</span>';
}

if(status === "offline"){
return '<span class="badge red">Missing</span>';
}

const state = (f.last_state || "").toLowerCase();

if(state.includes("route")){
return '<span class="badge yellow">Enroute</span>';
}

if(state.includes("approach")){
return '<span class="badge yellow">Approach</span>';
}

if(state.includes("boarding")){
return '<span class="badge blue">Boarding</span>';
}

if(state.includes("taxi")){
return '<span class="badge blue">Taxiing</span>';
}

if(state.includes("push")){
return '<span class="badge blue">Pushback</span>';
}

if(state.includes("block")){
return '<span class="badge blue">On Blocks</span>';
}

if(f.last_state){
return `<span class="badge blue">${f.last_state}</span>`;
}

return '<span class="badge blue">Online</span>';

}

function goToSection(id){

const el = document.getElementById(id);

if(el){
history.replaceState(null, null, "#" + id);
el.scrollIntoView({
behavior:"smooth",
block:"start"
});
}

}

async function loadDashboard(){

try{

const res = await fetch(
"https://ivaoth-bot.fly.dev/api/dashboard"
);

const data = await res.json();

document.getElementById("dPilots").innerText =
data.pilots_online;

document.getElementById("dAtc").innerText =
data.atc_online;

document.getElementById("dLanded").innerText =
data.landed;

document.getElementById("dMissing").innerText =
data.missing;

/* donut departures */
new Chart(document.getElementById("topDeps"), {
type: "doughnut",
data: {
labels: data.top_departures.map(x => x.icao),
datasets: [{
data: data.top_departures.map(x => x.count),
borderWidth: 0
}]
},
options: {
plugins:{
legend:{position:"bottom"}
},
cutout:"65%"
}
});

/* donut arrivals */
new Chart(document.getElementById("topArrs"), {
type: "doughnut",
data: {
labels: data.top_arrivals.map(x => x.icao),
datasets: [{
data: data.top_arrivals.map(x => x.count),
borderWidth: 0
}]
},
options: {
plugins:{
legend:{position:"bottom"}
},
cutout:"65%"
}
});

}catch(err){
console.log(err);
}

}

loadDashboard();
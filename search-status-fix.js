/* ===============================
   SEARCH STATUS FIX
   Do not mark online flights as MISSING.
=============================== */

function isSearchFlightMissing(f){
  const state = (f.last_state || '').trim().toLowerCase();
  const nearArrival = f.arrival_distance !== null && f.arrival_distance < 3;

  if(f.status === 'online') return false;
  if(state === 'on blocks' || state === 'landed') return false;
  if(nearArrival) return false;

  return Boolean(state || f.status === 'offline');
}

window.renderSearchStatus = function(f){
  const state = (f.last_state || '').trim().toLowerCase();

  if(state === 'on blocks') return '<span class="badge green">ON BLOCKS</span>';
  if(state === 'landed') return '<span class="badge green">LANDED</span>';

  if(f.arrival_distance !== null && f.arrival_distance < 3){
    return '<span class="badge green">ON BLOCKS</span>';
  }

  if(f.status === 'online'){
    if(state === 'ground') return '<span class="badge blue">GROUND</span>';
    if(state === 'departing') return '<span class="badge blue">DEPARTING</span>';
    if(state === 'climbing') return '<span class="badge cyan">CLIMBING</span>';
    if(state === 'en route') return '<span class="badge yellow">EN ROUTE</span>';
    if(state === 'approach') return '<span class="badge orange">APPROACH</span>';
    if(state) return `<span class="badge cyan">${state.toUpperCase()}</span>`;
    return '<span class="badge cyan">ONLINE</span>';
  }

  if(isSearchFlightMissing(f)) return '<span class="badge red">MISSING</span>';
  return '<span class="badge red">OFFLINE</span>';
};

window.applyFilter = function(){
  const hide = document.getElementById('hideMissing')?.checked;
  const filtered = hide ? latestData.filter(r => !isSearchFlightMissing(r)) : latestData;

  document.getElementById('statFlights').innerText = filtered.length;
  renderSearch(filtered);
};

window.getDisplayState = function(f){
  const state = (f.last_state || '').trim();

  if(f.landed_at) return 'LANDED';
  if(f.status === 'online') return state ? state.toUpperCase() : 'ONLINE';
  if(isSearchFlightMissing(f)) return 'MISSING';
  if(f.status === 'offline') return 'OFFLINE';
  return state ? state.toUpperCase() : 'ONLINE';
};

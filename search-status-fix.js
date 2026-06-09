/* ===============================
   SEARCH STATUS FIX
   Do not mark online flights as MISSING.
=============================== */

function isSearchFlightMissing(f){
  return f.status === 'disconnected';
}

window.renderSearchStatus = function(f){
  const state = (f.last_state || '').trim().toLowerCase();

  if(f.status === 'landed' || state === 'on blocks' || state === 'landed'){
    return `<span class="badge green">${state === 'on blocks' ? 'ON BLOCKS' : 'LANDED'}</span>`;
  }

  if(f.status === 'online'){
    if(state === 'ground') return '<span class="badge blue">GROUND</span>';
    if(state === 'departing') return '<span class="badge blue">DEPARTING</span>';
    if(state === 'climbing') return '<span class="badge cyan">CLIMBING</span>';
    if(state === 'en route') return '<span class="badge yellow">EN ROUTE</span>';
    if(state === 'approach') return '<span class="badge orange">APPROACH</span>';
    if(state) return `<span class="badge cyan">${window.escapeHtml(state.toUpperCase())}</span>`;
    return '<span class="badge cyan">ONLINE</span>';
  }

  if(f.status === 'no_departure') return '<span class="badge orange">NO DEPARTURE</span>';
  if(isSearchFlightMissing(f)) return '<span class="badge red">DISCONNECTED</span>';
  if(f.status === 'unknown') return '<span class="badge orange">UNKNOWN</span>';
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

  if(f.status === 'landed' || f.landed_at) return 'LANDED';
  if(f.status === 'online') return state ? state.toUpperCase() : 'ONLINE';
  if(f.status === 'no_departure') return 'NO DEPARTURE';
  if(isSearchFlightMissing(f)) return 'DISCONNECTED';
  if(f.status === 'unknown') return 'UNKNOWN';
  if(f.status === 'offline') return 'OFFLINE';
  return state ? state.toUpperCase() : 'ONLINE';
};

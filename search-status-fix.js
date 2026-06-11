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
    return renderQualityBadge(state === 'on blocks' ? 'ON BLOCKS' : 'LANDED', 'green');
  }

  if(f.status === 'online'){
    if(state === 'ground') return renderQualityBadge('GROUND', 'blue');
    if(state === 'departing') return renderQualityBadge('DEPARTING', 'blue');
    if(state === 'climbing') return renderQualityBadge('CLIMBING', 'cyan');
    if(state === 'en route') return renderQualityBadge('EN ROUTE', 'yellow');
    if(state === 'approach') return renderQualityBadge('APPROACH', 'orange');
    if(state) return renderQualityBadge(state.toUpperCase(), 'cyan');
    return renderQualityBadge('ONLINE', 'cyan');
  }

  if(f.status === 'no_departure') return renderQualityBadge('NO DEPARTURE', 'orange');
  if(isSearchFlightMissing(f)) return renderQualityBadge('DISCONNECTED', 'red');
  if(f.status === 'unknown') return renderQualityBadge('UNKNOWN', 'orange');
  return renderQualityBadge('OFFLINE', 'red');
};

window.applyFilter = function(){
  const filtered = window.getFilteredSearchData();
  updateSearchStats(filtered, latestDepFilter, latestArrFilter);
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

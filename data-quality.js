(function(global) {
  const statusDescriptions = {
    'ON BLOCKS': 'Arrived and reached the parking stand.',
    'LANDED': 'Touched down; may still be taxiing to the stand.',
    'GROUND': 'Currently online and moving or waiting on the ground.',
    'DEPARTING': 'Currently online in the departure phase.',
    'CLIMBING': 'Currently online and climbing after departure.',
    'EN ROUTE': 'Currently online and flying en route.',
    'APPROACH': 'Currently online in the arrival phase.',
    'ONLINE': 'The session is currently present in IVAO live data.',
    'NO DEPARTURE': 'Disconnected while still in a pre-departure ground state.',
    'DISCONNECTED': 'Disconnected after starting the flight, before a terminal state was recorded.',
    'OFFLINE': 'The session ended without enough track state to classify it.',
    'UNKNOWN': 'Live presence could not be verified because the IVAO live feed was unavailable.',
    'CIRCUIT': 'Departure and arrival airports are the same.',
    'RECONNECT': 'A matching pilot, callsign, and route reconnected within 30 minutes.'
  };

  function getDataQualityDescription(label) {
    return statusDescriptions[String(label || '').toUpperCase()]
      || 'Status reported by the latest available IVAO track data.';
  }

  function renderQualityBadge(label, color) {
    const safeLabel = global.escapeHtml(label);
    const description = global.escapeHtml(getDataQualityDescription(label));
    return `<span class="badge ${color} quality-badge" tabindex="0" aria-label="${safeLabel}: ${description}" data-tooltip="${description}">${safeLabel}</span>`;
  }

  function closeDataQualityPopover() {
    const popover = global.document?.getElementById('dataQualityPopover');
    const button = global.document?.getElementById('dataQualityButton');
    if (popover) popover.hidden = true;
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function toggleDataQualityPopover() {
    const popover = global.document.getElementById('dataQualityPopover');
    const button = global.document.getElementById('dataQualityButton');
    if (!popover || !button) return;

    const opening = popover.hidden;
    popover.hidden = !opening;
    button.setAttribute('aria-expanded', opening ? 'true' : 'false');
  }

  global.getDataQualityDescription = getDataQualityDescription;
  global.renderQualityBadge = renderQualityBadge;
  global.toggleDataQualityPopover = toggleDataQualityPopover;

  if (global.document) {
    global.document.addEventListener('click', event => {
      const wrap = event.target.closest('.data-quality-help');
      if (!wrap) closeDataQualityPopover();
    });

    global.document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeDataQualityPopover();
    });
  }
})(typeof window === 'undefined' ? globalThis : window);

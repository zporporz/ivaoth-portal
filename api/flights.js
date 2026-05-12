export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { from, to, dep, arr, airports } = req.query

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to required' })
  }

  try {
    // Build list of airports to query
    let icaoList = []

    if (airports) {
      icaoList = airports.split(',').map(x => x.trim()).filter(Boolean)
    } else {
      const set = new Set()
      if (dep) set.add(dep.trim().toUpperCase())
      if (arr) set.add(arr.trim().toUpperCase())
      icaoList = [...set]
    }

    if (icaoList.length === 0) {
      return res.status(400).json({ error: 'No airports specified' })
    }

    // Fetch traffics for each airport in parallel
    const results = await Promise.all(
      icaoList.map(icao =>
        fetch(
          `https://api.ivao.aero/v2/airports/${icao}/traffics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { headers: { 'apiKey': process.env.IVAO_API_KEY } }
        ).then(r => r.ok ? r.json() : []).catch(() => [])
      )
    )

    // Merge & deduplicate by session id
    const seen = new Set()
    const rows = []

    for (let i = 0; i < icaoList.length; i++) {
      const icao = icaoList[i]
      const airportData = results[i]

      // airportData is array of { inbound, outbound, flightover }
      const entries = Array.isArray(airportData) ? airportData : []

      for (const entry of entries) {
        // Check each direction
        const candidates = []

        if (entry.inbound) candidates.push({ flight: entry.inbound, dir: 'inbound' })
        if (entry.outbound) candidates.push({ flight: entry.outbound, dir: 'outbound' })
        if (entry.flightover) candidates.push({ flight: entry.flightover, dir: 'flightover' })

        for (const { flight, dir } of candidates) {
          if (!flight) continue

          // Filter by dep/arr if specified (not airport mode)
          if (!airports) {
            const flightDep = flight.flightPlan?.departureId || ''
            const flightArr = flight.flightPlan?.arrivalId || ''
            if (dep && arr) {
              if (flightDep !== dep && flightArr !== dep) continue
              if (flightArr !== arr && flightDep !== arr) continue
            } else if (dep && flightDep !== dep) continue
            else if (arr && flightArr !== arr) continue
          }

          const key = `${flight.id}-${dir}`
          if (seen.has(key)) continue
          seen.add(key)

          const fp = flight.flightPlan || {}

          rows.push({
            session_id: flight.id,
            user_id: flight.userId,
            callsign: flight.callsign,
            aircraft_id: fp.aircraftId || null,
            departure: fp.departureId || null,
            arrival: fp.arrivalId || null,
            connected_at: flight.createdAt,
            departed_at: null,
            landed_at: null,
            status: 'offline',
            last_state: flight.lastTrack?.state || '',
            direction: dir
          })
        }
      }
    }

    // Sort newest first
    rows.sort((a, b) => new Date(b.connected_at) - new Date(a.connected_at))

    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
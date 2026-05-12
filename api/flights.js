export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { from, to, dep, arr, airports } = req.query

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to required' })
  }

  try {
    let icaoList = []

    if (airports) {
      icaoList = airports.split(',').map(x => x.trim().toUpperCase()).filter(Boolean)
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
        ).then(r => r.ok ? r.json() : {}).catch(() => ({}))
      )
    )

    // IVAO returns { inbound: [...], outbound: [...], flightover: [...] }
    const seen = new Set()
    const rows = []

    for (let i = 0; i < icaoList.length; i++) {
      const data = results[i] || {}

      const inbound   = Array.isArray(data.inbound)   ? data.inbound   : []
      const outbound  = Array.isArray(data.outbound)  ? data.outbound  : []
      const flightover = Array.isArray(data.flightover) ? data.flightover : []

      const allFlights = [
        ...inbound.map(f => ({ flight: f, dir: 'inbound' })),
        ...outbound.map(f => ({ flight: f, dir: 'outbound' })),
        ...flightover.map(f => ({ flight: f, dir: 'flightover' }))
      ]

      for (const { flight, dir } of allFlights) {
        if (!flight) continue

        // Filter by dep/arr if not airport mode
        if (!airports) {
          const flightDep = (flight.flightPlan?.departureId || '').toUpperCase()
          const flightArr = (flight.flightPlan?.arrivalId || '').toUpperCase()
          const d = (dep || '').toUpperCase()
          const a = (arr || '').toUpperCase()

          if (d && a) {
            const forward  = flightDep === d && flightArr === a
            const backward = flightDep === a && flightArr === d
            if (!forward && !backward) continue
          } else if (d && flightDep !== d) continue
          else if (a && flightArr !== a) continue
        }

        const key = String(flight.id)
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

    rows.sort((a, b) => new Date(b.connected_at) - new Date(a.connected_at))

    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
const ICAO_PATTERN = /^[A-Z0-9]{4}$/
const TERMINAL_STATES = new Set(['on blocks', 'landed'])

export function isFlightOnline(flight, from, to, now = new Date()) {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const state = (flight.lastTrack?.state || '').trim().toLowerCase()
  const completedAt = flight.completedAt ? new Date(flight.completedAt) : null

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return false
  if (now < fromDate || now > toDate) return false
  if (completedAt && !Number.isNaN(completedAt.getTime()) && completedAt <= now) return false
  return !TERMINAL_STATES.has(state)
}

function parseIcaos(value) {
  return [...new Set(
    String(value || '')
      .split(',')
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
  )]
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { from, to, dep, arr, airports, bidirectional = 'true' } = req.query

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to required' })
  }

  try {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      return res.status(400).json({ error: 'Invalid date range' })
    }

    let icaoList = []

    if (airports) {
      icaoList = parseIcaos(airports)
    } else {
      icaoList = parseIcaos([dep, arr].filter(Boolean).join(','))
    }

    if (icaoList.length === 0) {
      return res.status(400).json({ error: 'No airports specified' })
    }
    if (icaoList.length > 20 || icaoList.some(icao => !ICAO_PATTERN.test(icao))) {
      return res.status(400).json({ error: 'Invalid airport ICAO list' })
    }

    const results = await Promise.all(
      icaoList.map(icao =>
        fetch(
          `https://api.ivao.aero/v2/airports/${icao}/traffics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { headers: { 'apiKey': process.env.IVAO_API_KEY } }
        ).then(r => r.ok ? r.json() : {}).catch(() => ({}))
      )
    )

    const seen = new Set()
    const rows = []

    for (let i = 0; i < icaoList.length; i++) {
      const data = results[i] || {}

      const inbound    = Array.isArray(data.inbound)    ? data.inbound    : []
      const outbound   = Array.isArray(data.outbound)   ? data.outbound   : []
      const flightover = Array.isArray(data.flightover) ? data.flightover : []

      const allFlights = [
        ...inbound.map(f => ({ flight: f, dir: 'inbound' })),
        ...outbound.map(f => ({ flight: f, dir: 'outbound' })),
        ...flightover.map(f => ({ flight: f, dir: 'flightover' }))
      ]

      for (const { flight, dir } of allFlights) {
        if (!flight) continue

        if (!airports) {
          const flightDep = (flight.flightPlan?.departureId || '').toUpperCase()
          const flightArr = (flight.flightPlan?.arrivalId || '').toUpperCase()
          const d = (dep || '').trim().toUpperCase()
          const a = (arr || '').trim().toUpperCase()

          if (d && a) {
            const forward  = flightDep === d && flightArr === a
            const backward = bidirectional !== 'false' && flightDep === a && flightArr === d
            if (!forward && !backward) continue
          } else if (d && flightDep !== d) continue
          else if (a && flightArr !== a) continue
        }

        const key = String(flight.id)
        if (seen.has(key)) continue
        seen.add(key)

        const fp = flight.flightPlan || {}
        const state = (flight.lastTrack?.state || '').trim()
        const status = isFlightOnline(flight, from, to) ? 'online' : 'offline'

        // Duration from `time` field (seconds)
        const durationSec = flight.time ?? null

        rows.push({
          session_id: flight.id,
          user_id: flight.userId,
          callsign: flight.callsign,
          aircraft_id: fp.aircraftId || null,
          departure: fp.departureId || null,
          arrival: fp.arrivalId || null,
          connected_at: flight.createdAt,
          completed_at: flight.completedAt || null,
          departed_at: null,
          landed_at: TERMINAL_STATES.has(state.toLowerCase()) ? true : null,
          status,
          last_state: state,
          duration_sec: durationSec,
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

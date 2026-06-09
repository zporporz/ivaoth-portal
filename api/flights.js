const ICAO_PATTERN = /^[A-Z0-9]{4}$/
const TERMINAL_STATES = new Set(['on blocks', 'landed'])
const PRE_DEPARTURE_STATES = new Set(['boarding', 'ground', 'connected', 'preparing'])
const ACTIVE_SESSION_CACHE_MS = 15000
const RECONNECT_WINDOW_MS = 30 * 60 * 1000

let activeSessionCache = { expiresAt: 0, ids: null }

export function rangeIncludesNow(from, to, now = new Date()) {
  const fromDate = new Date(from)
  const toDate = new Date(to)

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return false
  return now >= fromDate && now <= toDate
}

export function classifyFlight(flight, activeSessionIds = null) {
  const state = (flight.lastTrack?.state || '').trim().toLowerCase()
  const sessionId = String(flight.id)

  if (TERMINAL_STATES.has(state)) return 'landed'
  if (!(activeSessionIds instanceof Set)) return 'unknown'
  if (activeSessionIds.has(sessionId)) return 'online'
  if (PRE_DEPARTURE_STATES.has(state)) return 'no_departure'
  if (state) return 'disconnected'
  return 'offline'
}

async function getActivePilotSessionIds(headers) {
  if (activeSessionCache.ids && Date.now() < activeSessionCache.expiresAt) {
    return activeSessionCache.ids
  }

  const response = await fetch('https://api.ivao.aero/v2/tracker/whazzup', { headers })
  if (!response.ok) throw new Error(`Whazzup ${response.status}`)

  const data = await response.json()
  const pilots = Array.isArray(data.clients?.pilots) ? data.clients.pilots : []
  const ids = new Set(pilots.map(pilot => String(pilot.id)))
  activeSessionCache = { expiresAt: Date.now() + ACTIVE_SESSION_CACHE_MS, ids }
  return ids
}

export function annotateReconnects(rows) {
  const lastSessionByFlight = new Map()
  const chronologicalRows = [...rows].sort(
    (a, b) => new Date(a.connected_at) - new Date(b.connected_at)
  )

  for (const row of chronologicalRows) {
    const key = [
      row.user_id,
      String(row.callsign || '').toUpperCase(),
      String(row.departure || '').toUpperCase(),
      String(row.arrival || '').toUpperCase()
    ].join('|')
    const connectedAt = new Date(row.connected_at).getTime()
    const previousAt = lastSessionByFlight.get(key)

    row.is_reconnect = Number.isFinite(connectedAt)
      && Number.isFinite(previousAt)
      && connectedAt - previousAt <= RECONNECT_WINDOW_MS
    if (Number.isFinite(connectedAt)) lastSessionByFlight.set(key, connectedAt)
  }

  return rows
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

    const headers = { 'apiKey': process.env.IVAO_API_KEY }
    const trafficRequests = icaoList.map(icao =>
        fetch(
          `https://api.ivao.aero/v2/airports/${icao}/traffics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { headers }
        ).then(r => r.ok ? r.json() : {}).catch(() => ({}))
    )
    // Presence is independent from the search cutoff. A session returned by a
    // range ending a few minutes ago may still be connected right now.
    const activeSessionsRequest = getActivePilotSessionIds(headers).catch(() => null)

    const [results, activeSessionIds] = await Promise.all([
      Promise.all(trafficRequests),
      activeSessionsRequest
    ])

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
        const status = classifyFlight(flight, activeSessionIds)

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
          is_circuit: Boolean(fp.departureId && fp.departureId === fp.arrivalId),
          duration_sec: durationSec,
          direction: dir
        })
      }
    }

    annotateReconnects(rows)
    rows.sort((a, b) => new Date(b.connected_at) - new Date(a.connected_at))

    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

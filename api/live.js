const pilotRatingMap = {
  2: 'FS1', 3: 'FS2', 4: 'FS3',
  5: 'PP',  6: 'SPP', 7: 'CP',
  8: 'ATP', 9: 'SFI', 10: 'CFI'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const response = await fetch('https://api.ivao.aero/v2/tracker/whazzup', {
      headers: { 'apiKey': process.env.IVAO_API_KEY }
    })
    if (!response.ok) throw new Error(`IVAO API ${response.status}`)
    const data = await response.json()

    const pilots = data.clients?.pilots || []

    const thPilots = pilots.filter(p => {
      const dep = p.flightPlan?.departureId || ''
      const arr = p.flightPlan?.arrivalId || ''
      return dep.startsWith('VT') || arr.startsWith('VT')
    })

    const enriched = thPilots.map(p => {
      const fp = p.flightPlan || {}
      const prefix = (p.callsign || '').slice(0, 3).toUpperCase()

      return {
        session_id: p.id,
        callsign: p.callsign,
        user_id: p.userId,
        departure: fp.departureId || null,
        arrival: fp.arrivalId || null,
        last_state: p.lastTrack?.state || '',
        aircraft: fp.aircraftId || null,
        connected_at: p.createdAt,
        rating: pilotRatingMap[p.rating] || '',
        logo: null
      }
    })

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
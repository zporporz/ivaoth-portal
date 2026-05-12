export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const response = await fetch('https://api.ivao.aero/v2/tracker/whazzup', {
      headers: { 'apiKey': process.env.IVAO_API_KEY }
    })
    if (!response.ok) throw new Error(`IVAO API ${response.status}`)
    const data = await response.json()

    const pilots = data.clients?.pilots || []
    const atcs = data.clients?.atcs || []

    const thPilots = pilots.filter(p => {
      const dep = p.flightPlan?.departureId || ''
      const arr = p.flightPlan?.arrivalId || ''
      return dep.startsWith('VT') || arr.startsWith('VT')
    })

    const thAtcs = atcs.filter(a =>
      (a.callsign || '').startsWith('VT')
    )

    res.json({
      pilots: thPilots.length,
      atc: thAtcs.length,
      landed: null,
      missing: null,
      topDepartures: [],
      topArrivals: []
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
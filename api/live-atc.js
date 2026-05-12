const ratingMap = {
  2: 'AS1', 3: 'AS2', 4: 'AS3',
  5: 'ADC', 6: 'APC', 7: 'ACC',
  8: 'SEC', 9: 'SAI', 10: 'CAI'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const response = await fetch('https://api.ivao.aero/v2/tracker/whazzup', {
      headers: { 'apiKey': process.env.IVAO_API_KEY }
    })
    if (!response.ok) throw new Error(`IVAO API ${response.status}`)
    const data = await response.json()

    const atcs = data.clients?.atcs || []

    const thAtcs = atcs.filter(a =>
      (a.callsign || '').startsWith('VT')
    )

    const result = thAtcs
      .sort((a, b) => (a.callsign || '').localeCompare(b.callsign || ''))
      .map(a => {
        const parts = (a.callsign || '').split('_')
        const airport = parts[0] || ''
        const station = parts[1] || ''
        return {
          session_id: a.id,
          callsign: a.callsign,
          user_id: a.userId,
          airport,
          station,
          rating: ratingMap[a.rating] || `C${a.rating}`,
          connected_at: a.createdAt
        }
      })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
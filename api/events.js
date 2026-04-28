export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const response = await fetch('https://api.ivao.aero/v1/events', {
      headers: { 'apiKey': process.env.IVAO_API_KEY }
    })
    if (!response.ok) throw new Error(`IVAO API ${response.status}`)
    const data = await response.json()

    const thEvents = data.filter(e =>
      e.divisions && e.divisions.includes('TH')
    )

    res.json(thEvents)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
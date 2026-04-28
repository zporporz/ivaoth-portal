import pkg from 'pg'
const { Pool } = pkg

const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: false
})

async function getAirlineLogo(icao) {
  try {
    const logoRes = await fetch(`https://api.ivao.aero/v2/airlines/${icao}/logo`, {
      headers: { 'apiKey': process.env.IVAO_API_KEY }
    })
    if (!logoRes.ok) return null
    const blob = await logoRes.arrayBuffer()
    const b64 = Buffer.from(blob).toString('base64')
    const ct = logoRes.headers.get('content-type') || 'image/png'
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const { rows } = await db.query(`
      SELECT
        session_id, callsign, user_id,
        departure, arrival, last_state,
        connected_at, aircraft_id
      FROM pilot_sessions
      WHERE status = 'online'
        AND (departure LIKE 'VT%' OR arrival LIKE 'VT%')
      ORDER BY connected_at ASC
    `)

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const prefix = (row.callsign || '').slice(0, 3).toUpperCase()
        const isAirline = /^[A-Z]{3}$/.test(prefix)

        let logo = null
        if (isAirline) {
          logo = await getAirlineLogo(prefix)
        }

        return {
          session_id: row.session_id,
          callsign: row.callsign,
          user_id: row.user_id,
          departure: row.departure,
          arrival: row.arrival,
          last_state: row.last_state || '',
          aircraft: row.aircraft_id,
          connected_at: row.connected_at,
          logo
        }
      })
    )

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
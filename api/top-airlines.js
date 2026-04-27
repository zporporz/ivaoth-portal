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

async function getAirlineInfo(icao) {
  try {
    const res = await fetch(`https://api.ivao.aero/v2/airlines/${icao}`, {
      headers: { 'apiKey': process.env.IVAO_API_KEY }
    })
    if (!res.ok) return { name: null, logo: null }
    const data = await res.json()

    const logoRes = await fetch(`https://api.ivao.aero/v2/airlines/${icao}/logo`, {
      headers: { 'apiKey': process.env.IVAO_API_KEY }
    })

    let logo = null
    if (logoRes.ok) {
      const blob = await logoRes.arrayBuffer()
      const b64 = Buffer.from(blob).toString('base64')
      const ct = logoRes.headers.get('content-type') || 'image/png'
      logo = `data:${ct};base64,${b64}`
    }

    return { name: data.name || null, logo }
  } catch {
    return { name: null, logo: null }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const { rows } = await db.query('SELECT * FROM top_airlines_7d() LIMIT 5')

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const info = await getAirlineInfo(row.airline)
        return {
          airline: row.airline,
          total: row.total,
          name: info.name,
          logo: info.logo
        }
      })
    )

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
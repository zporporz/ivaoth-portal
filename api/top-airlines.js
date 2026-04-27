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
    return {
      name: data.name || null,
      logo: `https://api.ivao.aero/v2/airlines/${icao}/logo`
    }
  } catch {
    return { name: null, logo: null }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const { rows } = await db.query('SELECT * FROM top_airlines_7d()')

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
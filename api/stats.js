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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const pilots = await db.query(`
      SELECT COUNT(*) FROM pilot_sessions
      WHERE status = 'online'
        AND (departure LIKE 'VT%' OR arrival LIKE 'VT%')
    `)
    const atc = await db.query(`
      SELECT COUNT(*) FROM atc_sessions
      WHERE status = 'online'
        AND callsign LIKE 'VT%'
    `)
    const landed = await db.query(`
      SELECT COUNT(*) FROM pilot_sessions
      WHERE connected_at >= now() - interval '7 days'
        AND (departure LIKE 'VT%' OR arrival LIKE 'VT%')
        AND landed_at IS NOT NULL
    `)
    const missing = await db.query(`
      SELECT COUNT(*) FROM pilot_sessions
      WHERE connected_at >= now() - interval '7 days'
        AND (departure LIKE 'VT%' OR arrival LIKE 'VT%')
        AND status = 'offline'
        AND landed_at IS NULL
    `)
    const topDep = await db.query(`
      SELECT departure AS airport, COUNT(*) AS total
      FROM pilot_sessions
      WHERE connected_at >= now() - interval '7 days'
        AND departure LIKE 'VT%'
      GROUP BY departure ORDER BY total DESC LIMIT 6
    `)
    const topArr = await db.query(`
      SELECT arrival AS airport, COUNT(*) AS total
      FROM pilot_sessions
      WHERE connected_at >= now() - interval '7 days'
        AND arrival LIKE 'VT%'
      GROUP BY arrival ORDER BY total DESC LIMIT 6
    `)

    res.json({
      pilots: parseInt(pilots.rows[0].count),
      atc: parseInt(atc.rows[0].count),
      landed: parseInt(landed.rows[0].count),
      missing: parseInt(missing.rows[0].count),
      topDepartures: topDep.rows,
      topArrivals: topArr.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
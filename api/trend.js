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
    const { rows } = await db.query(`
      SELECT EXTRACT(HOUR FROM connected_at)::int AS hour, COUNT(*)::int AS total
      FROM pilot_sessions
      WHERE connected_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
        AND (departure LIKE 'VT%' OR arrival LIKE 'VT%')
      GROUP BY hour
      ORDER BY hour
    `)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
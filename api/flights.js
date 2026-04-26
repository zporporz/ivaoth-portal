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
  const { from, to, dep, arr, airports } = req.query

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to required' })
  }

  try {
    let query = `
      SELECT session_id, user_id, callsign, aircraft_id,
             departure, arrival, connected_at,
             departed_at, landed_at, status, last_state
      FROM pilot_sessions
      WHERE connected_at >= $1
        AND connected_at <= $2
        AND (departure LIKE 'VT%' OR arrival LIKE 'VT%')
    `
    const params = [from, to]

    if (airports) {
      const list = airports.split(',').filter(Boolean)
      if (list.length > 0) {
        const depOr = list.map((_, i) => `departure = $${params.length + i + 1}`).join(' OR ')
        const arrOr = list.map((_, i) => `arrival = $${params.length + list.length + i + 1}`).join(' OR ')
        query += ` AND (${depOr} OR ${arrOr})`
        params.push(...list, ...list)
      }
    } else {
      if (dep) { query += ` AND departure = $${params.length + 1}`; params.push(dep) }
      if (arr) { query += ` AND arrival = $${params.length + 1}`; params.push(arr) }
    }

    query += ` ORDER BY connected_at DESC LIMIT 2000`

    const { rows } = await db.query(query, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
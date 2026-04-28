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

const ratingMap = {
  0: 'AS1',
  1: 'AS2', 
  2: 'AS3',
  3: 'ADC',
  4: 'APC',
  5: 'ACC',
  6: 'SEC',
  7: 'SAI',
  8: 'CAI'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const { rows } = await db.query(`
      SELECT session_id, callsign, user_id, rating, connected_at
      FROM atc_sessions
      WHERE status = 'online'
        AND callsign LIKE 'VT%'
      ORDER BY callsign ASC
    `)

    const data = rows.map(row => {
      const parts = (row.callsign || '').split('_')
      const airport = parts[0] || ''
      const station = parts[1] || ''
      return {
        session_id: row.session_id,
        callsign: row.callsign,
        user_id: row.user_id,
        airport,
        station,
        rating: ratingMap[row.rating] || `C${row.rating}`,
        connected_at: row.connected_at
      }
    })

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
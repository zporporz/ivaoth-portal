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
    const { rows } = await db.query('SELECT * FROM top_airlines_7d()')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
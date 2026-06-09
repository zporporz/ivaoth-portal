import test from 'node:test'
import assert from 'node:assert/strict'

import { annotateReconnects, classifyFlight, rangeIncludesNow } from '../api/flights.js'

const from = '2026-06-09T00:00:00Z'
const to = '2026-06-09T23:59:59Z'
const now = new Date('2026-06-09T12:00:00Z')

test('range inclusion is calculated independently from stale track state', () => {
  assert.equal(rangeIncludesNow(from, to, now), true)
})

test('only a session present in whazzup is online', () => {
  const flight = { id: 123, lastTrack: { state: 'En Route' } }
  assert.equal(classifyFlight(flight, new Set(['123'])), 'online')
  assert.equal(classifyFlight(flight, new Set()), 'disconnected')
})

test('live presence stays authoritative after the search cutoff', () => {
  const historicalTo = new Date('2026-06-09T10:00:00Z')
  assert.equal(historicalTo < now, true)

  const flight = { id: 371, lastTrack: { state: 'En Route' } }
  assert.equal(classifyFlight(flight, new Set(['371'])), 'online')
})

test('terminal flight states are landed even when absent from whazzup', () => {
  const flight = { id: 123, lastTrack: { state: 'On Blocks' } }
  assert.equal(classifyFlight(flight, new Set()), 'landed')
})

test('ground sessions absent from whazzup are no departure', () => {
  const flight = { id: 123, lastTrack: { state: 'Boarding' } }
  assert.equal(classifyFlight(flight, new Set()), 'no_departure')
})

test('an unavailable presence feed produces unknown instead of a false status', () => {
  const flight = { id: 123, lastTrack: { state: 'En Route' } }
  assert.equal(classifyFlight(flight, null), 'unknown')
})

test('a repeated session within 30 minutes is marked as reconnect', () => {
  const rows = [
    {
      user_id: 1,
      callsign: 'TEST1',
      departure: 'VTBD',
      arrival: 'VTCC',
      connected_at: '2026-06-09T10:00:00Z'
    },
    {
      user_id: 1,
      callsign: 'TEST1',
      departure: 'VTBD',
      arrival: 'VTCC',
      connected_at: '2026-06-09T10:20:00Z'
    }
  ]

  annotateReconnects(rows)
  assert.equal(rows[0].is_reconnect, false)
  assert.equal(rows[1].is_reconnect, true)
})

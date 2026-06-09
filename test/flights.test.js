import test from 'node:test'
import assert from 'node:assert/strict'

import { isFlightOnline } from '../api/flights.js'

const from = '2026-06-09T00:00:00Z'
const to = '2026-06-09T23:59:59Z'
const now = new Date('2026-06-09T12:00:00Z')

test('active session inside the requested range is online', () => {
  const flight = { completedAt: null, lastTrack: { state: 'En Route' } }
  assert.equal(isFlightOnline(flight, from, to, now), true)
})

test('completed session is offline even when it has a non-terminal last state', () => {
  const flight = {
    completedAt: '2026-06-09T11:00:00Z',
    lastTrack: { state: 'En Route' }
  }
  assert.equal(isFlightOnline(flight, from, to, now), false)
})

test('terminal flight states are offline', () => {
  const flight = { completedAt: null, lastTrack: { state: 'On Blocks' } }
  assert.equal(isFlightOnline(flight, from, to, now), false)
})

test('sessions outside a historical range are not online', () => {
  const flight = { completedAt: null, lastTrack: { state: 'Ground' } }
  assert.equal(
    isFlightOnline(flight, '2026-06-01T00:00:00Z', '2026-06-01T23:59:59Z', now),
    false
  )
})

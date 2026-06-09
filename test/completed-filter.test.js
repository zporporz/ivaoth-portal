import test from 'node:test'
import assert from 'node:assert/strict'

function isCompletedFlight(flight) {
  const state = (flight.last_state || '').trim().toLowerCase()
  return flight.status === 'landed'
    || Boolean(flight.landed_at)
    || state === 'on blocks'
    || state === 'landed'
}

test('completed filter includes landed and on-blocks sessions', () => {
  assert.equal(isCompletedFlight({ status: 'landed', last_state: 'Landed' }), true)
  assert.equal(isCompletedFlight({ status: 'landed', last_state: 'On Blocks' }), true)
})

test('completed filter excludes incomplete sessions', () => {
  for (const status of ['online', 'disconnected', 'no_departure', 'offline', 'unknown']) {
    assert.equal(isCompletedFlight({ status, last_state: 'En Route' }), false)
  }
})

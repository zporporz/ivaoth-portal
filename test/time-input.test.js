import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../time-input.js', import.meta.url), 'utf8')
const context = {}
vm.runInNewContext(source, context)

const { formatUtcTimeInput, isValidUtcTime } = context

test('formats four numeric digits as HH:MM', () => {
  assert.equal(formatUtcTimeInput('1230'), '12:30')
  assert.equal(formatUtcTimeInput('12'), '12:')
  assert.equal(formatUtcTimeInput('1'), '1')
})

test('normalizes pasted separators and limits input to four digits', () => {
  assert.equal(formatUtcTimeInput('09.45'), '09:45')
  assert.equal(formatUtcTimeInput('123456'), '12:34')
})

test('validates 24-hour UTC times', () => {
  assert.equal(isValidUtcTime('00:00'), true)
  assert.equal(isValidUtcTime('23:59'), true)
  assert.equal(isValidUtcTime('24:00'), false)
  assert.equal(isValidUtcTime('12:60'), false)
  assert.equal(isValidUtcTime('12:'), false)
})

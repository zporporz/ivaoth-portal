import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../data-quality.js', import.meta.url), 'utf8')
const context = {
  escapeHtml: value => String(value)
}
vm.runInNewContext(source, context)

test('provides definitions for derived data-quality statuses', () => {
  for (const status of [
    'ON BLOCKS',
    'LANDED',
    'DISCONNECTED',
    'NO DEPARTURE',
    'OFFLINE',
    'UNKNOWN',
    'CIRCUIT',
    'RECONNECT'
  ]) {
    assert.notEqual(context.getDataQualityDescription(status), '')
  }
})

test('quality badges expose the explanation to keyboard and screen-reader users', () => {
  const badge = context.renderQualityBadge('DISCONNECTED', 'red')
  assert.match(badge, /tabindex="0"/)
  assert.match(badge, /aria-label="DISCONNECTED:/)
  assert.match(badge, /data-tooltip=/)
})

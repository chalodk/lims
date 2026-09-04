import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calendarMonthBounds,
  labelAnalysisArea,
  mergeTypeCounts,
  monthOverMonthPercent,
  rollingCalendarMonths,
} from './platformUsage'

describe('rollingCalendarMonths', () => {
  it('returns count months ending at the reference month', () => {
    const months = rollingCalendarMonths(6, new Date(2026, 8, 15))
    assert.equal(months.length, 6)
    assert.equal(months[0].monthKey, '2026-04')
    assert.equal(months[5].monthKey, '2026-09')
    assert.equal(months[4].monthKey, '2026-08')
  })
})

describe('calendarMonthBounds', () => {
  it('uses the next month as exclusive end', () => {
    const bounds = calendarMonthBounds(2026, 8)
    assert.equal(new Date(bounds.startIso).getMonth(), 8)
    assert.equal(new Date(bounds.endIso).getMonth(), 9)
  })
})

describe('monthOverMonthPercent', () => {
  it('returns 0 when both months are empty', () => {
    assert.equal(monthOverMonthPercent(0, 0), 0)
  })

  it('returns null when previous is 0 and current is not', () => {
    assert.equal(monthOverMonthPercent(12, 0), null)
  })

  it('rounds percent change', () => {
    assert.equal(monthOverMonthPercent(15, 10), 50)
    assert.equal(monthOverMonthPercent(8, 10), -20)
  })
})

describe('labelAnalysisArea', () => {
  it('maps db areas and canonical keys to the same analysis type', () => {
    assert.equal(labelAnalysisArea('virologia').key, 'virology')
    assert.equal(labelAnalysisArea('virology').key, 'virology')
    assert.equal(labelAnalysisArea('').key, '__uncategorized__')
    assert.equal(labelAnalysisArea('default').label, 'Sin categoría')
  })
})

describe('mergeTypeCounts', () => {
  it('sums duplicate labels and drops empty counts', () => {
    const merged = mergeTypeCounts([
      { type_key: 'nematologia', count: 2 },
      { type_key: 'nematology', count: 3 },
      { type_key: 'fitopatologia', count: 0 },
    ])
    assert.equal(merged.length, 1)
    assert.equal(merged[0]?.key, 'nematology')
    assert.equal(merged[0]?.count, 5)
  })
})

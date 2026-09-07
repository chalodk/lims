import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildResultsSearchOrFilter, sanitizeResultsSearchTerm } from './searchFilter'

describe('sanitizeResultsSearchTerm', () => {
  it('trims and strips PostgREST wildcards', () => {
    assert.equal(sanitizeResultsSearchTerm('  9485_%  '), '9485')
  })

  it('returns empty when the term is only punctuation', () => {
    assert.equal(sanitizeResultsSearchTerm('%%%'), '')
  })
})

describe('buildResultsSearchOrFilter', () => {
  it('returns null for a blank search without sample ids', () => {
    assert.equal(buildResultsSearchOrFilter('   '), null)
  })

  it('matches pathogen and diagnosis on the results table', () => {
    assert.equal(
      buildResultsSearchOrFilter('9485'),
      'pathogen_identified.ilike.%9485%,diagnosis.ilike.%9485%'
    )
  })

  it('includes matching sample ids so sample codes can be searched', () => {
    assert.equal(
      buildResultsSearchOrFilter('9485', ['aaa', 'bbb']),
      'pathogen_identified.ilike.%9485%,diagnosis.ilike.%9485%,sample_id.in.(aaa,bbb)'
    )
  })
})

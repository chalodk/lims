import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  analystNarrativeHtml,
  emptyRichTextToNull,
  joinVisibleRichHtml,
  richTextHasVisibleContent,
} from './richTextForPdf'

const emptyParagraph = '<p class="mb-1"></p>'
const emptyParagraphWithBreak = '<p class="mb-1"><br></p>'
const emptyParagraphWithTrailingBreak = '<p class="mb-1"><br class="ProseMirror-trailingBreak"></p>'
const visibleConclusion = '<p class="mb-1">Hay nematodos fitoparásitos.</p>'

describe('richTextHasVisibleContent', () => {
  it('treats TipTap empty documents as blank', () => {
    assert.equal(richTextHasVisibleContent(null), false)
    assert.equal(richTextHasVisibleContent(undefined), false)
    assert.equal(richTextHasVisibleContent(''), false)
    assert.equal(richTextHasVisibleContent('   '), false)
    assert.equal(richTextHasVisibleContent(emptyParagraph), false)
    assert.equal(richTextHasVisibleContent(emptyParagraphWithBreak), false)
    assert.equal(richTextHasVisibleContent(emptyParagraphWithTrailingBreak), false)
    assert.equal(richTextHasVisibleContent('<p>&nbsp;</p>'), false)
    assert.equal(richTextHasVisibleContent('<p>\u00a0</p>'), false)
  })

  it('keeps real text and images', () => {
    assert.equal(richTextHasVisibleContent(visibleConclusion), true)
    assert.equal(richTextHasVisibleContent('<p>  texto  </p>'), true)
    assert.equal(richTextHasVisibleContent('<p><img src="foto.png" alt=""></p>'), true)
  })
})

describe('joinVisibleRichHtml', () => {
  it('drops empty samples and keeps the written conclusion on one block', () => {
    const joined = joinVisibleRichHtml([
      visibleConclusion,
      emptyParagraph,
      emptyParagraphWithBreak,
      null,
      '   ',
    ])

    assert.equal(joined, visibleConclusion)
    assert.equal(joined.includes('\n'), false)
  })

  it('joins several visible conclusions with a newline', () => {
    const secondConclusion = '<p class="mb-1">Segunda muestra.</p>'
    const joined = joinVisibleRichHtml([
      visibleConclusion,
      emptyParagraph,
      secondConclusion,
    ])

    assert.equal(joined, `${visibleConclusion}\n${secondConclusion}`)
  })

  it('returns an empty string when every sample is blank', () => {
    assert.equal(
      joinVisibleRichHtml([emptyParagraph, emptyParagraphWithBreak, null]),
      ''
    )
  })
})

describe('analystNarrativeHtml', () => {
  it('stays empty when no result has a written narrative', () => {
    assert.equal(
      analystNarrativeHtml(
        [emptyParagraph, emptyParagraphWithBreak, null],
        [emptyParagraph, '   ']
      ),
      ''
    )
  })

  it('keeps the written conclusion and ignores a blank diagnosis', () => {
    assert.equal(
      analystNarrativeHtml(
        [emptyParagraph, visibleConclusion],
        [emptyParagraphWithBreak]
      ),
      visibleConclusion
    )
  })

  it('uses the secondary field only when the primary field is blank', () => {
    const diagnosis = '<p class="mb-1">Diagnóstico escrito.</p>'
    assert.equal(
      analystNarrativeHtml([emptyParagraph, null], [diagnosis]),
      diagnosis
    )
  })
})

describe('emptyRichTextToNull', () => {
  it('stores null for empty editor HTML and keeps visible HTML', () => {
    assert.equal(emptyRichTextToNull(emptyParagraph), null)
    assert.equal(emptyRichTextToNull(emptyParagraphWithBreak), null)
    assert.equal(emptyRichTextToNull(null), null)
    assert.equal(emptyRichTextToNull(visibleConclusion), visibleConclusion)
  })
})

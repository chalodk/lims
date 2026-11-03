/**
 * TipTap stores an empty field as HTML (`<p class="mb-1"></p>`, often with a `<br>`).
 * That string is not blank, so joining one fragment per sample still prints a line.
 */

const HTML_TAG = /<[^>]+>/g
const LINE_BREAK_TAG = /<br\s*[^>]*>/gi
const NON_BREAKING_SPACE = /&nbsp;|&#160;|&#x0*a0;/gi
const EMBEDDED_IMAGE = /<img\b/i

export function richTextHasVisibleContent(html: string | null | undefined): boolean {
  if (html == null) return false
  if (EMBEDDED_IMAGE.test(html)) return true

  const visibleText = html
    .replace(LINE_BREAK_TAG, '')
    .replace(HTML_TAG, '')
    .replace(NON_BREAKING_SPACE, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()

  return visibleText.length > 0
}

/** Persist null when the editor HTML has no visible text. */
export function emptyRichTextToNull(html: string | null | undefined): string | null {
  if (!richTextHasVisibleContent(html)) return null
  return html ?? null
}

/**
 * Keeps fragments that render text (or an image) and joins them with a newline,
 * the same separator used between samples in the PDF payload.
 */
export function joinVisibleRichHtml(
  fragments: Array<string | null | undefined>
): string {
  return fragments
    .filter((fragment): fragment is string => richTextHasVisibleContent(fragment))
    .join('\n')
}

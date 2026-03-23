import type { Editor } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Mark, Node as ProseMirrorNode, Schema } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'

const preserveSignificantSpacesKey = new PluginKey('preserveSignificantSpaces')

/**
 * HTML/CSS collapse normal ASCII spaces; nbsp survives serialization and PDF renderers.
 * True when this text node starts a new visual line inside its textblock (incl. after &lt;br&gt;).
 */
function isAtVisualLineStart(doc: ProseMirrorNode, textNodePos: number): boolean {
  const $pos = doc.resolve(textNodePos)
  if (!$pos.parent.isTextblock) {
    return false
  }
  const nodeBefore = $pos.nodeBefore
  if (nodeBefore === null) {
    return true
  }
  return nodeBefore.type.name === 'hardBreak'
}

type SpaceReplacement = { from: number; to: number; text: string; marks: readonly Mark[] }

function collectLeadingAsciiSpaceReplacements(doc: ProseMirrorNode): SpaceReplacement[] {
  const replacements: SpaceReplacement[] = []

  doc.descendants((node, pos) => {
    if (!node.isText) {
      return true
    }
    if (!isAtVisualLineStart(doc, pos)) {
      return true
    }
    const match = (node.text ?? '').match(/^( +)/)
    if (!match) {
      return true
    }
    const runLength = match[1].length
    replacements.push({
      from: pos,
      to: pos + runLength,
      text: '\u00A0'.repeat(runLength),
      marks: node.marks,
    })
    return true
  })

  return replacements
}

function applyReplacements(tr: Transaction, schema: Schema, replacements: SpaceReplacement[]): Transaction {
  const sorted = [...replacements].sort((a, b) => b.from - a.from)
  let next = tr
  for (const replacement of sorted) {
    next = next.replaceWith(
      replacement.from,
      replacement.to,
      schema.text(replacement.text, replacement.marks)
    )
  }
  return next
}

/**
 * Normalizes stored HTML so leading spaces in blocks become nbsp (for setContent / API payloads).
 * Mirrors the editor plugin so content round-trips even before the user edits again.
 */
export function normalizeLeadingAsciiSpacesInRichHtml(html: string): string {
  if (typeof window === 'undefined' || html.trim() === '') {
    return html
  }
  try {
    const parsed = new DOMParser().parseFromString(
      `<div id="rte-preserve-root">${html}</div>`,
      'text/html'
    )
    const root = parsed.getElementById('rte-preserve-root')
    if (!root) {
      return html
    }

    const processBlock = (block: Element) => {
      let lineStart = true
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const textNode = node as Text
          if (lineStart) {
            const match = textNode.data.match(/^( +)/)
            if (match) {
              textNode.data = '\u00A0'.repeat(match[1].length) + textNode.data.slice(match[1].length)
            }
            lineStart = false
          }
          return
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (element.tagName.toLowerCase() === 'br') {
            lineStart = true
            return
          }
          for (const child of Array.from(node.childNodes)) {
            walk(child)
          }
        }
      }
      for (const child of Array.from(block.childNodes)) {
        walk(child)
      }
    }

    root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').forEach(processBlock)
    return root.innerHTML
  } catch {
    return html
  }
}

/** Runs the same space→nbsp pass as the plugin (for load / setContent without a prior edit). */
export function runNormalizeSignificantSpaces(editor: Editor): void {
  const { state, view } = editor
  const replacements = collectLeadingAsciiSpaceReplacements(state.doc)
  if (replacements.length === 0) {
    return
  }
  const tr = applyReplacements(state.tr, state.schema, replacements)
  view.dispatch(tr)
}

export const PreserveSignificantSpaces = Extension.create({
  name: 'preserveSignificantSpaces',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: preserveSignificantSpacesKey,
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null
          }
          const replacements = collectLeadingAsciiSpaceReplacements(newState.doc)
          if (replacements.length === 0) {
            return null
          }
          return applyReplacements(newState.tr, newState.schema, replacements)
        },
      }),
    ]
  },
})

import { GapCursor } from '@tiptap/pm/gapcursor'
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import { NodeSelection } from '@tiptap/pm/state'

/**
 * Every toolbar/input-rule action that depends on the caret context.
 */
export type FormattingFeature =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'code'
  | 'link'
  | 'heading'
  | 'paragraph'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalRule'
  | 'tableInsert'

export type EditorCapabilities = Record<FormattingFeature, boolean>

export interface TextblockContext {
  inCodeBlock: boolean
  inHeading: boolean
  inTable: boolean
  inTableHeader: boolean
}

export interface FormattingContext {
  /** Every textblock touched by the selection; empty for non-text selections. */
  textblocks: readonly TextblockContext[]
  /** Any part of the selection carries the inline-code mark. */
  hasInlineCode: boolean
}

const contextCache = new WeakMap<EditorState, FormattingContext>()

/**
 * Reads the formatting context once per editor state. ProseMirror states are
 * immutable, so the cache stays valid for the lifetime of the state object.
 */
export function readFormattingContext(state: EditorState): FormattingContext {
  const cached = contextCache.get(state)
  if (cached) return cached

  const context = computeFormattingContext(state)
  contextCache.set(state, context)
  return context
}

function computeFormattingContext(state: EditorState): FormattingContext {
  const { selection } = state

  if (selection instanceof NodeSelection || selection instanceof GapCursor) {
    return { textblocks: [], hasInlineCode: false }
  }

  const textblocks: TextblockContext[] = []

  if (selection.empty) {
    const { $from } = selection
    if ($from.parent.isTextblock) {
      textblocks.push(textblockContext($from))
    }
  } else {
    for (const range of selection.ranges) {
      state.doc.nodesBetween(
        range.$from.pos,
        range.$to.pos,
        (node: ProseMirrorNode, pos: number) => {
          if (!node.isTextblock) return true

          textblocks.push(textblockContext(state.doc.resolve(pos + 1)))
          return false
        },
      )
    }
  }

  return {
    textblocks,
    hasInlineCode: selectionHasInlineCode(state),
  }
}

function textblockContext($pos: ResolvedPos): TextblockContext {
  let inTable = false
  let inTableHeader = false

  // A table cell can wrap lists/blockquotes around the textblock, so walk
  // every ancestor instead of only looking at the parent.
  for (let depth = $pos.depth - 1; depth > 0; depth -= 1) {
    const name = $pos.node(depth).type.name
    if (name === 'tableCell' || name === 'tableHeader') {
      inTable = true
      if (name === 'tableHeader') {
        inTableHeader = true
        break
      }
    }
  }

  return {
    inCodeBlock: $pos.parent.type.name === 'codeBlock',
    inHeading: $pos.parent.type.name === 'heading',
    inTable,
    inTableHeader,
  }
}

function selectionHasInlineCode(state: EditorState): boolean {
  const codeType = state.schema.marks.code
  if (!codeType) return false

  const { selection } = state
  if (selection.empty) {
    const marks = state.storedMarks ?? selection.$from.marks()
    return marks.some((mark) => mark.type === codeType)
  }

  return selection.ranges.some((range) =>
    state.doc.rangeHasMark(range.$from.pos, range.$to.pos, codeType),
  )
}

export function textblockAllows(
  textblock: TextblockContext,
  feature: FormattingFeature,
): boolean {
  switch (feature) {
    case 'bold':
      return (
        !textblock.inCodeBlock &&
        !textblock.inHeading &&
        !textblock.inTableHeader
      )
    case 'italic':
    case 'strike':
    case 'underline':
    case 'code':
      return !textblock.inCodeBlock
    case 'link':
      return !textblock.inCodeBlock
    case 'heading':
    case 'paragraph':
    case 'blockquote':
    case 'tableInsert':
      // Block structure inside a table cell cannot be represented by a GFM
      // table, so keep cells inline-only.
      return !textblock.inCodeBlock && !textblock.inTable
    case 'bulletList':
    case 'orderedList':
      // A heading cannot be converted into a list, and GFM table cells only
      // support inline content.
      return (
        !textblock.inCodeBlock && !textblock.inHeading && !textblock.inTable
      )
    case 'codeBlock':
      // Allowed to leave an existing code block, even one inside a cell.
      return !textblock.inTable || textblock.inCodeBlock
    case 'horizontalRule':
      // A rule is a block and cannot live inside a heading or a table cell.
      return (
        !textblock.inCodeBlock && !textblock.inHeading && !textblock.inTable
      )
  }
}

function contextAllows(
  context: FormattingContext,
  feature: FormattingFeature,
): boolean {
  // Strict semantics: every selected textblock must support the action. An
  // empty textblock list (image node selection, gap cursor) disables all
  // actions because `every` would otherwise return true.
  if (context.textblocks.length === 0) return false

  if (feature === 'link' && context.hasInlineCode) return false

  return context.textblocks.every((textblock) =>
    textblockAllows(textblock, feature),
  )
}

export function canApplyFeature(
  state: EditorState,
  feature: FormattingFeature,
): boolean {
  return contextAllows(readFormattingContext(state), feature)
}

export function getEditorCapabilities(
  state: EditorState,
): EditorCapabilities {
  const context = readFormattingContext(state)

  return {
    bold: contextAllows(context, 'bold'),
    italic: contextAllows(context, 'italic'),
    strike: contextAllows(context, 'strike'),
    underline: contextAllows(context, 'underline'),
    code: contextAllows(context, 'code'),
    link: contextAllows(context, 'link'),
    heading: contextAllows(context, 'heading'),
    paragraph: contextAllows(context, 'paragraph'),
    bulletList: contextAllows(context, 'bulletList'),
    orderedList: contextAllows(context, 'orderedList'),
    blockquote: contextAllows(context, 'blockquote'),
    codeBlock: contextAllows(context, 'codeBlock'),
    horizontalRule: contextAllows(context, 'horizontalRule'),
    tableInsert: contextAllows(context, 'tableInsert'),
  }
}
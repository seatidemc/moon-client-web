import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model'
import { Fragment, Slice } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'

import {
  readFormattingContext,
  textblockAllows,
  type FormattingFeature,
  type TextblockContext,
} from './tiptap-formatting-context'

/**
 * Blocks that the formatting layer disallows inside a table cell. Pasting them
 * into a cell would leave content the toolbar cannot convert back to a
 * paragraph, so they are flattened before insertion.
 */
const CELL_DISALLOWED_BLOCKS = new Set([
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
])

const MARK_FEATURES: Partial<Record<string, FormattingFeature>> = {
  bold: 'bold',
  italic: 'italic',
  strike: 'strike',
  underline: 'underline',
  code: 'code',
  link: 'link',
}

interface DestinationContext {
  inTable: boolean
  inTableHeader: boolean
  inHeading: boolean
  inCodeBlock: boolean
}

/**
 * Removes formatting from pasted content that the caret context cannot undo:
 * marks that the destination/block type disallows and block structure that
 * cannot exist inside a table cell. Structure is otherwise preserved, and the
 * slice keeps its original openness (clamped to the cleaned content).
 */
export function sanitizePastedSlice(
  slice: Slice,
  state: EditorState,
): Slice {
  const destination = readDestinationContext(state)
  const flattened = flattenCellBlocks(
    slice.content,
    state.schema,
    destination.inTable,
  )
  const filtered = filterMarks(
    flattened,
    {
      inCodeBlock: false,
      inHeading: false,
      inTable: destination.inTable,
      inTableHeader: destination.inTableHeader,
    },
    destination,
    true,
    slice.openStart > 0,
    slice.openEnd > 0,
  )

  if (filtered.eq(slice.content)) return slice

  const maxOpen = Slice.maxOpen(filtered)

  return new Slice(
    filtered,
    Math.min(slice.openStart, maxOpen.openStart),
    Math.min(slice.openEnd, maxOpen.openEnd),
  )
}

function readDestinationContext(state: EditorState): DestinationContext {
  const { textblocks } = readFormattingContext(state)

  return {
    // Pasting into any part of a table cell inserts blocks into that cell.
    inTable: textblocks.length > 0 && textblocks.every((block) => block.inTable),
    inTableHeader: textblocks.some((block) => block.inTableHeader),
    inHeading: textblocks.some((block) => block.inHeading),
    inCodeBlock: textblocks.some((block) => block.inCodeBlock),
  }
}

function flattenCellBlocks(
  fragment: Fragment,
  schema: Schema,
  inCell: boolean,
): Fragment {
  const nodes: ProseMirrorNode[] = []

  fragment.forEach((node) => {
    const isCell =
      node.type.name === 'tableCell' || node.type.name === 'tableHeader'

    if (isCell) {
      nodes.push(node.copy(flattenCellBlocks(node.content, schema, true)))
      return
    }

    if (inCell && CELL_DISALLOWED_BLOCKS.has(node.type.name)) {
      nodes.push(...flattenBlock(node, schema))
      return
    }

    if (node.isLeaf) {
      nodes.push(node)
      return
    }

    // Descending below a cell's direct children leaves the cell context.
    nodes.push(node.copy(flattenCellBlocks(node.content, schema, false)))
  })

  return Fragment.fromArray(nodes)
}

function flattenBlock(
  node: ProseMirrorNode,
  schema: Schema,
): ProseMirrorNode[] {
  if (node.type.name === 'horizontalRule') return []

  // Headings and code blocks become paragraphs so their text can live in a
  // cell; inline marks are filtered afterwards.
  if (node.isTextblock) {
    return [schema.nodes.paragraph.create(null, node.content)]
  }

  if (
    node.type.name === 'bulletList' ||
    node.type.name === 'orderedList' ||
    node.type.name === 'listItem' ||
    node.type.name === 'blockquote'
  ) {
    const blocks: ProseMirrorNode[] = []
    node.forEach((child) => {
      blocks.push(...flattenBlock(child, schema))
    })
    return blocks
  }

  return [node]
}

/**
 * `mergeStart`/`mergeEnd` mark the top-level textblocks whose inline content
 * will be merged into the destination textblock. Only those inherit the
 * destination's restrictions (e.g. no bold when the caret is in a heading);
 * the remaining pasted blocks keep their own context.
 */
function filterMarks(
  fragment: Fragment,
  parent: TextblockContext,
  destination: DestinationContext,
  topLevel: boolean,
  mergeStart: boolean,
  mergeEnd: boolean,
): Fragment {
  const nodes: ProseMirrorNode[] = []

  fragment.forEach((node, _offset, index) => {
    const isFirst = index === 0
    const isLast = index === fragment.childCount - 1
    const mergesIntoDestination =
      topLevel && ((isFirst && mergeStart) || (isLast && mergeEnd))

    if (node.isTextblock) {
      const context: TextblockContext = {
        inCodeBlock:
          node.type.name === 'codeBlock' ||
          (mergesIntoDestination && destination.inCodeBlock),
        inHeading:
          node.type.name === 'heading' ||
          (mergesIntoDestination && destination.inHeading),
        inTable: parent.inTable,
        inTableHeader: parent.inTableHeader,
      }
      nodes.push(node.copy(filterInline(node.content, context)))
      return
    }

    if (node.isInline) {
      // Inline content is always merged into the destination textblock.
      const context: TextblockContext = {
        inCodeBlock: topLevel && destination.inCodeBlock,
        inHeading: topLevel && destination.inHeading,
        inTable: parent.inTable,
        inTableHeader: parent.inTableHeader,
      }
      nodes.push(filterNodeMarks(node, context))
      return
    }

    if (node.isLeaf) {
      nodes.push(node)
      return
    }

    // A nested table has its own header/cell contexts.
    const entersTable = node.type.name === 'table'
    nodes.push(
      node.copy(
        filterMarks(
          node.content,
          {
            inCodeBlock: false,
            inHeading: false,
            inTable: entersTable
              ? false
              : parent.inTable ||
                node.type.name === 'tableCell' ||
                node.type.name === 'tableHeader',
            inTableHeader: entersTable
              ? false
              : parent.inTableHeader || node.type.name === 'tableHeader',
          },
          destination,
          false,
          false,
          false,
        ),
      ),
    )
  })

  return Fragment.fromArray(nodes)
}

function filterInline(
  fragment: Fragment,
  context: TextblockContext,
): Fragment {
  const nodes: ProseMirrorNode[] = []

  // A textblock only ever contains inline content.
  fragment.forEach((node) => {
    nodes.push(filterNodeMarks(node, context))
  })

  return Fragment.fromArray(nodes)
}

function filterNodeMarks(
  node: ProseMirrorNode,
  context: TextblockContext,
): ProseMirrorNode {
  const marks = node.marks.filter((mark) => {
    const feature = MARK_FEATURES[mark.type.name]
    return !feature || textblockAllows(context, feature)
  })

  if (marks.length === node.marks.length) return node
  if (node.isText) return node.type.schema.text(node.text as string, marks)

  return node.type.create(node.attrs, node.content, marks)
}
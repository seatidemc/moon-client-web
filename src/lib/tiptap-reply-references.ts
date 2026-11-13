import { mergeAttributes, Node } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/** Whether the document already quotes this floor. */
export function hasReplyReference(doc: ProseMirrorNode, floor: number) {
  let found = false

  doc.descendants((node) => {
    if (node.type.name === 'replyReference' && node.attrs.floor === floor) {
      found = true
    }

    return !found
  })

  return found
}

/**
 * An atomic `re#楼层号` chip. As a single inline node the cursor never enters
 * it, so Backspace removes the whole chip instead of editing its label.
 */
export const ReplyReference = Node.create({
  name: 'replyReference',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      floor: {
        default: 0,
        parseHTML: (element) =>
          Number.parseInt(element.getAttribute('data-floor') ?? '', 10) || 0,
        renderHTML: (attributes) => ({ 'data-floor': String(attributes.floor) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span.reply-reference' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'reply-reference' }),
      `#${node.attrs.floor}`,
    ]
  },

  renderMarkdown: (node) => `re#${node.attrs?.floor ?? 0}`,
})
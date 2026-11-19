import { mergeAttributes, Node } from '@tiptap/core'

/**
 * An atomic `@username` chip. As a single inline node the cursor never enters
 * it, so Backspace removes the whole mention instead of editing its label.
 */
export const Mention = Node.create({
  name: 'mention',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      userId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-user-id') ?? '',
        renderHTML: (attributes) => ({
          'data-user-id': String(attributes.userId),
        }),
      },
      handle: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-handle') ?? '',
        renderHTML: (attributes) => ({
          'data-handle': String(attributes.handle),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-tag-type="mention"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'mention',
        'data-tag-type': 'mention',
      }),
      `@${node.attrs.handle}`,
    ]
  },

  renderMarkdown: (node) => `@${node.attrs?.handle ?? ''}`,
})
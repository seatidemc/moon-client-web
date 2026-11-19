import { mergeAttributes, Node } from '@tiptap/core'

/**
 * An atomic `@username` chip. As a single inline node the cursor never enters
 * it, so Backspace removes the whole mention instead of editing its label.
 * The HTML contract is `span[data-tag-type="mention"][data-user-id]` with
 * `@username` as its text; the class is only used for styling.
 */
export const Mention = Node.create({
  name: 'mention',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      userId: {
        default: 0,
        parseHTML: (element) =>
          Number.parseInt(element.getAttribute('data-user-id') ?? '', 10) || 0,
        renderHTML: (attributes) => ({
          'data-user-id': String(attributes.userId),
        }),
      },
      username: {
        default: '',
        parseHTML: (element) => (element.textContent ?? '').replace(/^@/, ''),
        renderHTML: () => ({}),
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
      `@${node.attrs.username}`,
    ]
  },

  renderMarkdown: (node) => `@${node.attrs?.username ?? ''}`,
})
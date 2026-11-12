import { Extension, InputRule, type Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { PluginKey } from '@tiptap/pm/state'
import { Suggestion, type SuggestionOptions } from '@tiptap/suggestion'

import {
  replaceEmojiShortcodes,
  resolveEmojiShortcode,
} from '@/lib/emoji-shortcodes'
import {
  searchEmojiItems,
  type EmojiSuggestionItem,
} from '@/lib/emoji-suggestion'

const SHORTCODE_INPUT_PATTERN = /:([a-zA-Z0-9_+-]+):$/

export const EmojiSuggestionPluginKey = new PluginKey('emojiSuggestion')

type EmojiShortcodesOptions = {
  suggestion: Omit<
    SuggestionOptions<EmojiSuggestionItem, EmojiSuggestionItem>,
    'editor'
  >
}

/**
 * Adds `:` emoji suggestions and converts typed `:smile:` shortcodes into emoji
 * text, so the document always stores the emoji the user sees.
 */
export const EmojiShortcodes = Extension.create<EmojiShortcodesOptions>({
  name: 'emojiShortcodes',

  addOptions(): EmojiShortcodesOptions {
    return {
      suggestion: {
        char: ':',
        // `:` also follows Chinese text, which has no spaces.
        allowedPrefixes: null,
        pluginKey: EmojiSuggestionPluginKey,
        items: ({ query }) => searchEmojiItems(query),
        command: ({ editor, range, props }) => {
          // Insert literally so the emoji is stored as a text character.
          editor.view.dispatch(
            editor.state.tr.insertText(props.emoji, range.from, range.to),
          )
          editor.view.focus()
        },
        allow: ({ editor, state, range }) => {
          if (editor.isActive('code') || editor.isActive('codeBlock')) {
            return false
          }

          return state.doc.resolve(range.from).parent.isTextblock
        },
      },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: SHORTCODE_INPUT_PATTERN,
        handler: ({ state, range, match }) => {
          const emoji = resolveEmojiShortcode(match[1])
          if (!emoji) return

          state.tr.insertText(emoji, range.from, range.to)
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

/**
 * Expands shortcodes already in the document, e.g. after importing Markdown or
 * switching into rich text. Code and links are skipped.
 */
export function expandEmojiShortcodes(editor: Editor) {
  const { state } = editor
  const replacements: {
    pos: number
    node: ProseMirrorNode
    text: string
  }[] = []

  state.doc.descendants((node, pos, parent) => {
    if (!node.isText || !node.text) return

    if (
      parent?.type.name === 'codeBlock' ||
      node.marks.some(
        (mark) => mark.type.name === 'code' || mark.type.name === 'link',
      )
    ) {
      return
    }

    const text = replaceEmojiShortcodes(node.text)
    if (text !== node.text) replacements.push({ pos, node, text })
  })

  if (replacements.length === 0) return

  const tr = state.tr
  // Apply from the end so earlier positions stay valid.
  for (const { pos, node, text } of replacements.reverse()) {
    tr.replaceWith(pos, pos + node.nodeSize, state.schema.text(text, node.marks))
  }

  editor.view.dispatch(tr)
}
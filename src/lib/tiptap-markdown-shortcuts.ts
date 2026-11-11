import { Extension, markInputRule } from '@tiptap/core'

/**
 * StarterKit's inline Markdown input rules only fire after whitespace. These
 * additional rules keep the same behavior next to CJK text, where a space is
 * often not typed before inline formatting.
 */
export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    const bold = this.editor.schema.marks.bold
    const italic = this.editor.schema.marks.italic
    const strike = this.editor.schema.marks.strike

    if (!bold || !italic || !strike) return []

    return [
      markInputRule({
        find: /(\*\*(?!\s+\*\*)((?:[^*\n]+))\*\*(?!\s+\*\*))$/,
        type: bold,
      }),
      markInputRule({
        find: /(?<!\*)(\*(?!\*)(?!\s+\*)((?:[^*\n]+))\*(?!\s+\*))$/,
        type: italic,
      }),
      markInputRule({
        find: /(~~(?!\s+~~)((?:[^~\n]+))~~(?!\s+~~))$/,
        type: strike,
      }),
    ]
  },
})

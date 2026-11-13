import { markInputRule, markPasteRule } from '@tiptap/core'
import {
  Bold,
  starInputRegex,
  starPasteRegex,
  underscoreInputRegex,
  underscorePasteRegex,
} from '@tiptap/extension-bold'
import { Code } from '@tiptap/extension-code'

import { canApplyFeature } from '@/lib/tiptap-formatting-context'

/**
 * Bold renders identically to headings and table headers, so Markdown input
 * and paste rules must stay literal there. Returning `false` from
 * `getAttributes` makes the rule a no-op before it can delete the delimiters.
 */
export const ContextualBold = Bold.extend({
  addInputRules() {
    const editor = this.editor
    const getAttributes = () =>
      canApplyFeature(editor.state, 'bold') ? {} : false

    return [
      markInputRule({
        find: starInputRegex,
        type: this.type,
        getAttributes,
      }),
      markInputRule({
        find: underscoreInputRegex,
        type: this.type,
        getAttributes,
      }),
    ]
  },

  addPasteRules() {
    const editor = this.editor
    const getAttributes = () =>
      canApplyFeature(editor.state, 'bold') ? {} : false

    return [
      markPasteRule({
        find: starPasteRegex,
        type: this.type,
        getAttributes,
      }),
      markPasteRule({
        find: underscorePasteRegex,
        type: this.type,
        getAttributes,
      }),
    ]
  },
})

/**
 * Inline code may carry bold/italic/strike/underline but never a link. The
 * mutual exclusion is enforced by the mark schema, covering toolbar actions,
 * shortcuts, paste and autolink alike.
 *
 * This extension is registered after every other inline mark so Markdown
 * serialization wraps the code span (`**` + "`x`" + `**`). The opposite order
 * produces `*` + "`x`" + `*`, which loses the italic mark when parsed back.
 */
export const ContextualCode = Code.extend({ excludes: 'link' })
import { InputRule } from '@tiptap/core'
import Blockquote from '@tiptap/extension-blockquote'
import BulletList from '@tiptap/extension-bullet-list'
import CodeBlock from '@tiptap/extension-code-block'
import Heading from '@tiptap/extension-heading'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import OrderedList from '@tiptap/extension-ordered-list'

import {
  canApplyFeature,
  type FormattingFeature,
} from '@/lib/tiptap-formatting-context'

/**
 * Block input rules (`# `, `- `, `> `, code fences, `---`) can still create
 * block structure inside contexts where the toolbar disables it. Wrapping the
 * original handler lets the rule bail out before it consumes the typed text,
 * so the literal markers stay in place.
 */
function guardInputRules(
  rules: InputRule[],
  feature: FormattingFeature,
): InputRule[] {
  return rules.map(
    (rule) =>
      new InputRule({
        find: rule.find,
        undoable: rule.undoable,
        handler: (props) =>
          canApplyFeature(props.state, feature) ? rule.handler(props) : null,
      }),
  )
}

export const ContextualHeading = Heading.extend({
  addInputRules() {
    return guardInputRules(this.parent!(), 'heading')
  },
})

export const ContextualBulletList = BulletList.extend({
  addInputRules() {
    return guardInputRules(this.parent!(), 'bulletList')
  },
})

export const ContextualOrderedList = OrderedList.extend({
  addInputRules() {
    return guardInputRules(this.parent!(), 'orderedList')
  },
})

export const ContextualBlockquote = Blockquote.extend({
  addInputRules() {
    return guardInputRules(this.parent!(), 'blockquote')
  },
})

export const ContextualCodeBlock = CodeBlock.extend({
  addInputRules() {
    return guardInputRules(this.parent!(), 'codeBlock')
  },
})

export const ContextualHorizontalRule = HorizontalRule.extend({
  addInputRules() {
    return guardInputRules(this.parent!(), 'horizontalRule')
  },
})
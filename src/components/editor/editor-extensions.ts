import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import type { SuggestionProps } from '@tiptap/suggestion'

import type { EmojiSuggestionItem } from '@/lib/emoji-suggestion'
import { EmojiShortcodes } from '@/lib/tiptap-emoji-shortcodes'
import { MarkdownShortcuts } from '@/lib/tiptap-markdown-shortcuts'
import { ReplyReference } from '@/lib/tiptap-reply-references'

import {
  ContextualBlockquote,
  ContextualBulletList,
  ContextualCodeBlock,
  ContextualHeading,
  ContextualHorizontalRule,
  ContextualOrderedList,
} from './editor-contextual-blocks'
import { ContextualBold, ContextualCode } from './editor-contextual-marks'
import { FormattingGuards } from './editor-formatting-guards'

interface EmojiSuggestionHandlers {
  update: (
    props: SuggestionProps<EmojiSuggestionItem, EmojiSuggestionItem>,
    resetIndex?: boolean,
  ) => void
  hide: () => void
}

interface EditorExtensionOptions extends EmojiSuggestionHandlers {
  /** Shown while the document is empty; omit to disable the placeholder. */
  placeholder?: string
}

/**
 * The rich-text schema. HTML is the document format; Markdown is only an
 * import/export conversion.
 */
export function createEditorExtensions({
  update,
  hide,
  placeholder,
}: EditorExtensionOptions) {
  return [
    // Bold and code are registered explicitly: bold needs guarded Markdown
    // rules and code must coexist with other inline marks. Code stays after
    // StarterKit so it gets the highest inline mark rank, which keeps
    // `**`code`**` style Markdown serialization round-trippable. Block nodes
    // with input rules are re-registered below for the same context guards.
    ContextualBold,
    StarterKit.configure({
      blockquote: false,
      bold: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      orderedList: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
      },
    }),
    ContextualCode,
    ContextualHeading,
    ContextualBulletList,
    ContextualOrderedList,
    ContextualBlockquote,
    ContextualCodeBlock,
    ContextualHorizontalRule,
    TableKit.configure({
      table: {
        resizable: true,
        lastColumnResizable: true,
        // Keep the same scroll container in the editor and in rendered posts.
        renderWrapper: true,
      },
    }),
    Image.configure({
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        minWidth: 80,
        minHeight: 80,
        alwaysPreserveAspectRatio: true,
      },
    }),
    Markdown,
    MarkdownShortcuts,
    EmojiShortcodes.configure({
      suggestion: {
        render: () => ({
          onStart: update,
          onUpdate: update,
          onExit: hide,
        }),
      },
    }),
    ReplyReference,
    FormattingGuards,
    ...(placeholder
      ? [Placeholder.configure({ placeholder, showOnlyWhenEditable: true })]
      : []),
  ]
}
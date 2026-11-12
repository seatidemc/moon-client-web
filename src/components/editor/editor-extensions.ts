import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import type { SuggestionProps } from '@tiptap/suggestion'

import type { EmojiSuggestionItem } from '@/lib/emoji-suggestion'
import { EmojiShortcodes } from '@/lib/tiptap-emoji-shortcodes'
import { MarkdownShortcuts } from '@/lib/tiptap-markdown-shortcuts'
import { ReplyReferenceChips } from '@/lib/tiptap-reply-references'

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
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
      },
    }),
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
    ReplyReferenceChips,
    ...(placeholder
      ? [Placeholder.configure({ placeholder, showOnlyWhenEditable: true })]
      : []),
  ]
}
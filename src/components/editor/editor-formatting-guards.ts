import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

import { sanitizePastedSlice } from '@/lib/tiptap-paste-cleaner'
import {
  canApplyFeature,
  type FormattingFeature,
} from '@/lib/tiptap-formatting-context'

const SHORTCUT_FEATURES: Record<string, FormattingFeature> = {
  'Mod-b': 'bold',
  'Mod-i': 'italic',
  'Mod-Shift-s': 'strike',
  'Mod-u': 'underline',
  'Mod-e': 'code',
  'Mod-Alt-c': 'codeBlock',
  'Mod-Shift-b': 'blockquote',
  'Mod-Shift-8': 'bulletList',
  'Mod-Shift-7': 'orderedList',
  'Mod-Alt-0': 'paragraph',
  'Mod-Alt-1': 'heading',
  'Mod-Alt-2': 'heading',
  'Mod-Alt-3': 'heading',
  'Mod-Alt-4': 'heading',
  'Mod-Alt-5': 'heading',
  'Mod-Alt-6': 'heading',
}

/**
 * Swallows formatting shortcuts when the current caret context does not
 * support them. Allowed shortcuts return `false` so the original StarterKit
 * handler continues to run.
 */
export const FormattingGuards = Extension.create({
  name: 'formattingGuards',

  // Run before every StarterKit keymap plugin.
  priority: 1000,

  addKeyboardShortcuts() {
    return Object.fromEntries(
      Object.entries(SHORTCUT_FEATURES).map(([keys, feature]) => [
        keys,
        () => !canApplyFeature(this.editor.state, feature),
      ]),
    )
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPasted: (slice, view) =>
            sanitizePastedSlice(slice, view.state),
        },
      }),
    ]
  },
})
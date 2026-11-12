import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { REPLY_REFERENCE_PATTERN } from '@/lib/reply-references'

interface ReplyReferenceChipsState {
  /** Floors that currently exist in the thread. */
  floors: ReadonlySet<number>
}

export const replyReferenceChipsKey = new PluginKey<ReplyReferenceChipsState>(
  'replyReferenceChips',
)

/** Tells the editor which floors exist so only those refs become chips. */
export function setReplyReferenceFloors(
  editor: Editor,
  floors: ReadonlySet<number>,
) {
  editor.view.dispatch(editor.state.tr.setMeta(replyReferenceChipsKey, floors))
}

/**
 * Renders valid `re#楼层号` references as chips while editing. Decorations are
 * view-only, so the HTML serialization and the stored text never change.
 */
export const ReplyReferenceChips = Extension.create({
  name: 'replyReferenceChips',

  addProseMirrorPlugins() {
    return [
      new Plugin<ReplyReferenceChipsState>({
        key: replyReferenceChipsKey,
        state: {
          init: () => ({ floors: new Set<number>() }),
          apply(transaction, previous) {
            const floors = transaction.getMeta(replyReferenceChipsKey) as
              | ReadonlySet<number>
              | undefined

            return floors ? { floors } : previous
          },
        },
        props: {
          decorations(state) {
            const floors = replyReferenceChipsKey.getState(state)?.floors
            if (!floors || floors.size === 0) return DecorationSet.empty

            const decorations: Decoration[] = []

            state.doc.descendants((node, pos, parent) => {
              if (!node.isText || !node.text) return

              if (
                parent?.type.name === 'codeBlock' ||
                node.marks.some(
                  (mark) =>
                    mark.type.name === 'code' || mark.type.name === 'link',
                )
              ) {
                return
              }

              for (const match of node.text.matchAll(REPLY_REFERENCE_PATTERN)) {
                const floor = Number.parseInt(match[2], 10)
                if (!floors.has(floor)) continue

                const from = pos + (match.index ?? 0) + match[1].length
                const to = from + 're#'.length + match[2].length

                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'reply-reference',
                    'data-floor': String(floor),
                  }),
                )
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
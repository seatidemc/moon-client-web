import { cn } from '@heroui/react'
import { fromHtml } from 'hast-util-from-html'
import {
  defaultSchema,
  sanitize,
  type Schema,
} from 'hast-util-sanitize'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { Link } from 'react-router-dom'

import type { ReplyReferenceOptions } from '@/lib/reply-references'
import { applyRichTextFeatures } from '@/lib/rich-text-hast'

interface PostContentProps {
  /** Rich-text HTML authored by the editor. */
  children: string
  className?: string
  /** 传入后启用跟帖回复语法 re#楼层号 */
  replyReferences?: ReplyReferenceOptions
}

type AttributeDefinitions = NonNullable<
  NonNullable<Schema['attributes']>[string]
>
type AttributeDefinition = AttributeDefinitions[number]

const LENGTH_STYLE = /^(?:width|min-width): \d+(?:\.\d+)?px;?$/
const ALIGN_STYLE = /^text-align: (?:left|center|right);?$/
const COLUMN_WIDTH = /^\d+(?:,\d+)*$/

function withAllowedClass(
  definitions: AttributeDefinitions | undefined,
  ...classNames: string[]
): AttributeDefinitions {
  return [
    ...(definitions ?? []).filter(
      (definition) =>
        !(Array.isArray(definition) && definition[0] === 'className'),
    ),
    ['className', ...classNames] as AttributeDefinition,
  ]
}

/**
 * The editor can freely resize table columns and images. Those sizes live in
 * `colwidth`, `<col>` and `<img>` attributes, so the sanitizer must preserve
 * them instead of normalizing the document down to plain prose.
 */
const postSchema: Schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'colgroup',
    'col',
    // The editor's underline mark renders as `<u>`, which the default
    // sanitizer schema does not allow.
    'u',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: withAllowedClass(
      defaultSchema.attributes?.a,
      'data-footnote-backref',
      'reply-reference',
    ),
    // Chips pointing at floors that no longer exist stay spans; keep their
    // styling and floor. Existing floors are rewritten to links above.
    span: [
      ...withAllowedClass(defaultSchema.attributes?.span, 'reply-reference'),
      ['dataFloor', /^\d+$/] as AttributeDefinition,
    ],
    div: withAllowedClass(defaultSchema.attributes?.div, 'tableWrapper'),
    table: [
      ...(defaultSchema.attributes?.table ?? []),
      ['style', LENGTH_STYLE] as AttributeDefinition,
    ],
    col: [['style', LENGTH_STYLE] as AttributeDefinition],
    th: [
      ['colwidth', COLUMN_WIDTH] as AttributeDefinition,
      ['style', ALIGN_STYLE] as AttributeDefinition,
    ],
    td: [
      ['colwidth', COLUMN_WIDTH] as AttributeDefinition,
      ['style', ALIGN_STYLE] as AttributeDefinition,
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ['width', /^\d+$/] as AttributeDefinition,
      ['height', /^\d+$/] as AttributeDefinition,
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    // Pasted images are stored as data URLs until uploads exist.
    src: [...(defaultSchema.protocols?.src ?? []), 'data'],
  },
}

export function PostContent({
  children,
  className,
  replyReferences,
}: PostContentProps) {
  const tree = fromHtml(children, { fragment: true })

  applyRichTextFeatures(tree, replyReferences)

  const rendered = toJsxRuntime(sanitize(tree, postSchema), {
    Fragment,
    components: {
      a({ href, children: linkChildren, className: linkClassName, title }) {
        // `//host` is protocol-relative and must stay an external link.
        if (href?.startsWith('/') && !href.startsWith('//')) {
          return (
            <Link to={href} className={linkClassName} title={title}>
              {linkChildren}
            </Link>
          )
        }

        const isExternal = Boolean(href && /^(?:https?:)?\/\//.test(href))

        return (
          <a
            href={href}
            className={linkClassName}
            title={title}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noreferrer' : undefined}
          >
            {linkChildren}
          </a>
        )
      },
    },
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true,
  })

  return <div className={cn('moon-rich-text', className)}>{rendered}</div>
}
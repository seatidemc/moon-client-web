import { cn } from '@heroui/react'
import type { Nodes } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import {
  defaultSchema,
  sanitize,
  type Schema,
} from 'hast-util-sanitize'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent } from 'react'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { Link } from 'react-router-dom'

import { openImageLightbox } from '@/lib/image-lightbox'
import { mediaUrl } from '@/lib/media'
import type { ReplyReferenceOptions } from '@/lib/reply-references'
import { applyRichTextFeatures } from '@/lib/rich-text-hast'

interface PostContentProps {
  /** Rich-text HTML authored by the editor. */
  children: string
  className?: string
  /** 点击图片时打开与图片同一楼层内的图片预览。 */
  imageLightbox?: boolean
  /** 传入后启用楼层回复语法 re#楼层号 */
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
      'mention',
    ),
    // Chips pointing at floors that no longer exist stay spans; keep their
    // styling, type and floor. Existing floors are rewritten to links above.
    span: [
      ...withAllowedClass(
        defaultSchema.attributes?.span,
        'reply-reference',
        'mention',
      ),
      ['dataTagType', /^(?:reply|mention)$/] as AttributeDefinition,
      ['dataFloor', /^\d+$/] as AttributeDefinition,
      ['dataUserId', /^\d+$/] as AttributeDefinition,
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
      // 图片对齐由编辑器写入；缺失时按左对齐处理。
      ['dataAlign', /^(?:left|center|right)$/] as AttributeDefinition,
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    // 正文图片必须先上传；data: URL 只允许出现在编辑器粘贴阶段并被清理，
    // 渲染服务端内容时不再放行。
    src: (defaultSchema.protocols?.src ?? []).filter(
      (protocol) => protocol !== 'data',
    ),
  },
}

interface ZoomableImageProps extends ComponentPropsWithoutRef<'img'> {
  /** hast 在 `passNode` 开启时注入，不能透传到 DOM。 */
  node?: unknown
}

/**
 * 正文图片点击后用 PhotoSwipe 放大。每层楼各自渲染一个 PostContent，
 * 因此最近的 `.moon-rich-text` 容器就是该楼层，预览范围天然按楼层划分。
 */
function ZoomableImage({ node: _node, alt, ...props }: ZoomableImageProps) {
  function open(image: HTMLImageElement) {
    const post = image.closest('.moon-rich-text')
    if (!post) return

    void openImageLightbox(
      Array.from(post.querySelectorAll<HTMLImageElement>('img')),
      image,
    )
  }

  return (
    <img
      {...props}
      alt={alt}
      data-post-image=""
      role="button"
      tabIndex={0}
      aria-label={alt ? `${alt}（查看大图）` : '查看大图'}
      onClick={(event: MouseEvent<HTMLImageElement>) => {
        // 图片可能被链接包裹，放大时不要同时跳转。
        event.preventDefault()
        event.stopPropagation()
        open(event.currentTarget)
      }}
      onKeyDown={(event: KeyboardEvent<HTMLImageElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return

        event.preventDefault()
        open(event.currentTarget)
      }}
    />
  )
}

/** 正文图片以相对路径存储，渲染前补上 API 源（见 `mediaUrl`）。 */
function resolveImageSources(node: Nodes) {
  if (node.type === 'element' && node.tagName === 'img') {
    const src = node.properties?.src
    if (typeof src === 'string') node.properties.src = mediaUrl(src)
  }

  if (!('children' in node)) return

  for (const child of node.children) {
    if (child.type === 'element') resolveImageSources(child)
  }
}

export function PostContent({
  children,
  className,
  imageLightbox = false,
  replyReferences,
}: PostContentProps) {
  const tree = fromHtml(children, { fragment: true })

  applyRichTextFeatures(tree, replyReferences)

  const sanitized = sanitize(tree, postSchema)
  resolveImageSources(sanitized)

  const rendered = toJsxRuntime(sanitized, {
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
      ...(imageLightbox ? { img: ZoomableImage } : {}),
    },
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true,
  })

  return <div className={cn('moon-rich-text', className)}>{rendered}</div>
}
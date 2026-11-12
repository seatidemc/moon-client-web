import { cn } from '@heroui/react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import type { PluggableList } from 'unified'

import { remarkEmoji } from '@/lib/remark-emoji'
import {
  remarkReplyReferences,
  type ReplyReferenceOptions,
} from '@/lib/remark-reply-references'
import { remarkHashtags } from '@/lib/remark-hashtags'

interface MarkdownViewProps {
  children: string
  className?: string
  /** 传入后启用跟帖回复语法 re#楼层号 */
  replyReferences?: ReplyReferenceOptions
}

export function MarkdownView({
  children,
  className,
  replyReferences,
}: MarkdownViewProps) {
  const remarkPlugins: PluggableList = [
    remarkGfm,
    remarkHashtags,
    remarkEmoji,
  ]

  if (replyReferences) {
    remarkPlugins.push([remarkReplyReferences, replyReferences])
  }

  return (
    <div className={cn('moon-prose', className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={{
          a({ href, children: linkChildren, className, title }) {
            if (href?.startsWith('/')) {
              return (
                <Link to={href} className={className} title={title}>
                  {linkChildren}
                </Link>
              )
            }

            const isExternal = Boolean(href && /^https?:\/\//.test(href))

            return (
              <a
                href={href}
                className={className}
                title={title}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
              >
                {linkChildren}
              </a>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

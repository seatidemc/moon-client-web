import { cn } from '@heroui/react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import remarkGfm from 'remark-gfm'

import { remarkHashtags } from '@/lib/remark-hashtags'

interface MarkdownViewProps {
  children: string
  className?: string
}

export function MarkdownView({ children, className }: MarkdownViewProps) {
  return (
    <div className={cn('moon-prose', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkHashtags]}
        components={{
          a({ href, children: linkChildren }) {
            if (href?.startsWith('/')) {
              return <Link to={href}>{linkChildren}</Link>
            }

            const isExternal = Boolean(href && /^https?:\/\//.test(href))

            return (
              <a
                href={href}
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

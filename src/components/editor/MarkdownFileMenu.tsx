import { Dropdown } from '@heroui/react'
import { ChevronDown, FileDown, FileText, FileUp } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'

interface MarkdownFileMenuProps {
  onImport: (markdown: string) => void
  onExport: () => void
}

/**
 * Markdown import/export. The document itself is always edited as rich text;
 * Markdown is only read from or written to a local file here.
 */
export function MarkdownFileMenu({
  onImport,
  onExport,
}: MarkdownFileMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Allow choosing the same file again later.
    event.target.value = ''
    if (!file) return

    void file
      .text()
      .then(onImport)
      .catch(() => {
        // 无法读取的文件直接忽略。
      })
  }

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger
          type="button"
          aria-label="导入或导出 Markdown"
          className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium whitespace-nowrap text-muted transition-colors hover:bg-default-soft hover:text-foreground"
        >
          <FileText className="size-3.5" aria-hidden="true" />
          <span>Markdown</span>
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end" className="min-w-44">
          <Dropdown.Menu
            aria-label="Markdown 操作"
            onAction={(key) => {
              if (key === 'import') fileInputRef.current?.click()
              if (key === 'export') onExport()
            }}
          >
            <Dropdown.Item id="import" textValue="导入 Markdown">
              <FileUp className="size-4 text-muted" aria-hidden="true" />
              <span data-slot="label">导入 Markdown</span>
            </Dropdown.Item>
            <Dropdown.Item id="export" textValue="导出 Markdown">
              <FileDown className="size-4 text-muted" aria-hidden="true" />
              <span data-slot="label">导出 Markdown</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        aria-label="选择 Markdown 文件"
        onChange={handleFileChange}
      />
    </>
  )
}
import { Dropdown } from '@heroui/react'
import { FileCode2, FileDown, FileInput, FileUp } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'

interface DocumentFileMenuProps {
  onImportMarkdown: (markdown: string) => void
  onExportMarkdown: () => void
  onExportHtml: () => void
}

/**
 * File conversions for the document. The document itself is always rich text;
 * Markdown is only read from or written to a local file here.
 */
export function DocumentFileMenu({
  onImportMarkdown,
  onExportMarkdown,
  onExportHtml,
}: DocumentFileMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Allow choosing the same file again later.
    event.target.value = ''
    if (!file) return

    void file
      .text()
      .then(onImportMarkdown)
      .catch(() => {
        // 无法读取的文件直接忽略。
      })
  }

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger
          type="button"
          aria-label="导入或导出文件"
          className="inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-default-soft"
        >
          <FileInput className="size-4" aria-hidden="true" />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end" className="min-w-44">
          <Dropdown.Menu
            aria-label="文件操作"
            onAction={(key) => {
              if (key === 'import') fileInputRef.current?.click()
              if (key === 'export-markdown') onExportMarkdown()
              if (key === 'export-html') onExportHtml()
            }}
          >
            <Dropdown.Item id="import" textValue="导入 Markdown">
              <FileUp className="size-4 text-muted" aria-hidden="true" />
              <span data-slot="label">导入 Markdown</span>
            </Dropdown.Item>
            <Dropdown.Item id="export-markdown" textValue="导出 Markdown">
              <FileDown className="size-4 text-muted" aria-hidden="true" />
              <span data-slot="label">导出 Markdown</span>
            </Dropdown.Item>
            <Dropdown.Item id="export-html" textValue="导出 HTML">
              <FileCode2 className="size-4 text-muted" aria-hidden="true" />
              <span data-slot="label">导出 HTML</span>
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
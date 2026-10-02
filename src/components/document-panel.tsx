import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import type { KnowledgeNode } from '../../shared/schema'

type Props = { node: KnowledgeNode; content: string; onClose: () => void }

export function DocumentPanel({ node, content, onClose }: Props) {
  const body = content
    .replace(/^#\s+([^\n]+)(?:\r?\n|$)/, (heading, title: string) =>
      title.trim() === node.title ? '' : heading,
    )
    .trim()
  return (
    <aside className="document-panel" aria-label="개념 문서">
      <div className="document-header">
        <h2>{node.title}</h2>
        <Button variant="ghost" size="icon-sm" aria-label="문서 닫기" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <div className="document-scroll markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" />,
            img: ({ alt }) => <span>[이미지: {alt ?? '설명 없음'}]</span>,
          }}
        >
          {body || '아직 작성된 내용이 없습니다.'}
        </ReactMarkdown>
      </div>
    </aside>
  )
}

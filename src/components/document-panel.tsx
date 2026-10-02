import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowDownRight, Check, Copy, FileText, GitBranch, Pencil, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { statuses, kinds } from '@/lib/presentation'
import { readStorage, writeStorage } from '@/lib/api'
import type { KnowledgeNode, NodeStatus, Project } from '../../shared/schema'

type Props = {
  project: Project
  node: KnowledgeNode
  saving: boolean
  onClose: () => void
  onBranch: (id: string) => void
  onSelect: (id: string) => void
  onStatus: (id: string, status: NodeStatus) => void
  onSave: (id: string, content: string, revision: string) => Promise<Project | null>
}
type Draft = { content: string; base: string }
const sessionDrafts = new Map<string, Draft>()

export function DocumentPanel({
  project,
  node,
  saving,
  onClose,
  onBranch,
  onSelect,
  onStatus,
  onSave,
}: Props) {
  const source = project.documents[node.id] ?? ''
  const key = `study-space:draft:${project.id}:${node.id}`
  const [draft, setDraft] = useState<Draft>(() => {
    if (sessionDrafts.has(key)) return sessionDrafts.get(key)!
    try {
      const saved = JSON.parse(readStorage(key) ?? 'null')
      if (saved && typeof saved.content === 'string' && typeof saved.base === 'string') return saved
    } catch {
      /* 원문을 표시합니다. */
    }
    return { content: source, base: source }
  })
  const dirty = draft.content !== draft.base
  const conflict = dirty && source !== draft.base && source !== draft.content
  const [editing, setEditing] = useState(dirty)
  const [discardOpen, setDiscardOpen] = useState(false)
  const KindIcon = kinds[node.kind].icon
  const connected = project.edges
    .filter((edge) => edge.source === node.id)
    .map((edge) => project.nodes.find((item) => item.id === edge.target)!)
    .filter(Boolean)
  const parents = project.edges
    .filter((edge) => edge.target === node.id)
    .map((edge) => project.nodes.find((item) => item.id === edge.source)!)
    .filter(Boolean)
  useEffect(() => {
    if (!dirty || source === draft.content) {
      setDraft({ content: source, base: source })
      sessionDrafts.delete(key)
      writeStorage(key, null)
    }
  }, [source, key, dirty, draft.content])
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])
  const update = (content: string) => {
    const next = { ...draft, content }
    setDraft(next)
    sessionDrafts.set(key, next)
    writeStorage(key, JSON.stringify(next))
  }
  const save = async () => {
    const saved = await onSave(node.id, draft.content, project.revision)
    if (saved) {
      const content = saved.documents[node.id]
      setDraft({ content, base: content })
      sessionDrafts.delete(key)
      writeStorage(key, null)
      setEditing(false)
      toast.success('문서를 저장했습니다.')
    }
  }
  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(message)
    } catch {
      toast.error('복사하지 못했습니다. 내용을 직접 선택해 복사해 주십시오.')
    }
  }
  return (
    <aside className="document-panel" aria-label="개념 상세 문서">
      <div className="document-topbar">
        <span>
          <FileText size={14} /> 개념 노트
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="문서 닫기" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="document-scroll">
        {parents.length > 0 && (
          <div className="parent-links">
            {parents.map((parent) => (
              <button key={parent.id} onClick={() => onSelect(parent.id)}>
                <ArrowDownRight size={12} />
                {parent.title}
              </button>
            ))}
          </div>
        )}
        <div className="document-title">
          <span className={`document-kind ${node.kind === 'question' ? 'question-kind' : ''}`}>
            <KindIcon size={19} />
          </span>
          <span className="eyebrow">{kinds[node.kind].label}</span>
          <h2>{node.title}</h2>
          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="document-metadata">
          <span>학습 상태</span>
          <Select
            value={node.status}
            onValueChange={(value) => onStatus(node.id, value as NodeStatus)}
            disabled={saving}
          >
            <SelectTrigger
              className={`h-7! w-auto border-0 bg-transparent! shadow-none ${statuses[node.status].className}`}
              aria-label="학습 상태"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statuses).map(([value, status]) => (
                <SelectItem key={value} value={value}>
                  <status.icon size={13} />
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="document-tabs">
          <div>
            <button className={!editing ? 'active' : ''} onClick={() => setEditing(false)}>
              읽기
            </button>
            <button className={editing ? 'active' : ''} onClick={() => setEditing(true)}>
              <Pencil size={12} />
              편집{dirty && <span className="draft-dot" />}
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="문서 복사"
            onClick={() => void copy(editing ? draft.content : source, '문서를 복사했습니다.')}
          >
            <Copy />
          </Button>
        </div>
        {conflict && (
          <div className="document-conflict" role="alert">
            <p>원문이 외부에서 변경되었습니다. 초안을 복사한 뒤 최신 문서를 확인해 주십시오.</p>
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => void copy(draft.content, '초안을 복사했습니다.')}
              >
                초안 복사
              </Button>
              <Button variant="outline" size="xs" onClick={() => setDiscardOpen(true)}>
                최신 문서 불러오기
              </Button>
            </div>
          </div>
        )}
        {editing ? (
          <div className="markdown-editor">
            <Textarea
              aria-label="Markdown 문서 편집"
              value={draft.content}
              onChange={(event) => update(event.target.value)}
              spellCheck={false}
              maxLength={200000}
            />
            <div className="editor-footer">
              <span>{dirty ? '기기에 초안 보관 중' : 'Markdown'}</span>
              <Button size="sm" disabled={!dirty || saving || conflict} onClick={() => void save()}>
                <Save size={13} />
                {saving ? '저장 중' : '문서 저장'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" />,
                img: ({ alt }) => (
                  <span className="text-muted-foreground">[이미지: {alt ?? '설명 없음'}]</span>
                ),
              }}
            >
              {source || '아직 작성된 내용이 없습니다.'}
            </ReactMarkdown>
          </div>
        )}
        {connected.length > 0 && (
          <section className="related-concepts">
            <h3>
              이어지는 생각 <span>{connected.length}</span>
            </h3>
            {connected.map((item) => (
              <button key={item.id} onClick={() => onSelect(item.id)}>
                <GitBranch size={14} />
                <span>{item.title}</span>
                <ArrowDownRight size={13} />
              </button>
            ))}
          </section>
        )}
        <button
          className="source-path"
          onClick={() =>
            void copy(
              `knowledge/${project.id}/documents/${node.document}`,
              '파일 경로를 복사했습니다.',
            )
          }
          title="문서 경로 복사"
        >
          <FileText size={12} />
          <span>{node.document}</span>
          <Copy size={11} />
        </button>
      </div>
      <div className="document-bottom">
        <Button
          variant="outline"
          className="flex-1"
          disabled={saving}
          onClick={() => onBranch(node.id)}
        >
          <GitBranch />
          질문 가지 추가
        </Button>
        <Button
          variant={node.status === 'understood' ? 'secondary' : 'default'}
          size="icon"
          disabled={saving}
          aria-label={node.status === 'understood' ? '공부 중으로 변경' : '이해함으로 표시'}
          onClick={() =>
            onStatus(node.id, node.status === 'understood' ? 'exploring' : 'understood')
          }
        >
          <Check />
        </Button>
      </div>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>최신 문서를 불러오겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 개념의 저장하지 않은 초안은 삭제됩니다. 필요한 내용은 먼저 복사해 주십시오.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDraft({ content: source, base: source })
                sessionDrafts.delete(key)
                writeStorage(key, null)
              }}
            >
              불러오기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

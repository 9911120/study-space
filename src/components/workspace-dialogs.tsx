import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  GitBranch,
  Keyboard,
  LoaderCircle,
  Plus,
  Search,
  StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { kinds } from '@/lib/presentation'
import type { NodeKind, Project, ProjectInput } from '../../shared/schema'

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  onCreate: (value: ProjectInput) => Promise<unknown>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<ProjectInput['color']>('lime')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      await onCreate({ title: title.trim(), description, color })
      setTitle('')
      setDescription('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로젝트를 만들지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <div className="dialog-symbol">
              <GitBranch />
            </div>
            <DialogTitle>무엇을 공부하고 싶으신가요?</DialogTitle>
            <DialogDescription>하나의 질문에서 새로운 학습 지도를 시작합니다.</DialogDescription>
          </DialogHeader>
          <div className="form-fields">
            <label htmlFor="project-title">
              학습 주제
              <Input
                id="project-title"
                placeholder="예: LLM의 작동 원리"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                autoFocus
                required
                disabled={busy}
              />
            </label>
            <label htmlFor="project-description">
              학습 목표 <span className="text-muted-foreground font-normal">(선택)</span>
              <Textarea
                id="project-description"
                placeholder="이 주제를 통해 이해하고 싶은 내용을 적습니다."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={400}
                disabled={busy}
              />
            </label>
            <fieldset>
              <legend className="mb-2 text-xs">프로젝트 색상</legend>
              <div className="flex gap-2">
                {(['lime', 'blue', 'amber', 'rose'] as const).map((item) => (
                  <button
                    type="button"
                    key={item}
                    aria-label={`${{ lime: '연두', blue: '파랑', amber: '노랑', rose: '분홍' }[item]} 색상`}
                    aria-pressed={color === item}
                    onClick={() => setColor(item)}
                    className={`color-picker ${item} ${color === item ? 'selected' : ''}`}
                    disabled={busy}
                  />
                ))}
              </div>
            </fieldset>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              취소
            </Button>
            <Button type="submit" disabled={!title.trim() || busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Plus />}학습 공간 만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CreateNodeDialog({
  open,
  onOpenChange,
  parentTitle,
  onCreate,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  parentTitle?: string
  onCreate: (value: { title: string; summary: string; kind: NodeKind }) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [kind, setKind] = useState<NodeKind>(parentTitle ? 'question' : 'concept')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      if (await onCreate({ title: title.trim(), summary, kind })) {
        setTitle('')
        setSummary('')
        onOpenChange(false)
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <div className="dialog-symbol">
              <GitBranch />
            </div>
            <DialogTitle>
              {parentTitle ? '생각을 한 단계 더 연결합니다.' : '새로운 생각을 추가합니다.'}
            </DialogTitle>
            <DialogDescription>
              {parentTitle
                ? `‘${parentTitle}’에서 이어지는 가지입니다.`
                : '캔버스에 개념, 질문, 메모를 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="form-fields">
            <div className="kind-picker">
              {(['concept', 'question', 'note'] as const).map((item) => {
                const Icon = kinds[item].icon
                return (
                  <Button
                    key={item}
                    type="button"
                    variant={kind === item ? 'secondary' : 'ghost'}
                    aria-pressed={kind === item}
                    onClick={() => setKind(item)}
                    disabled={busy}
                  >
                    <Icon />
                    {kinds[item].label}
                  </Button>
                )
              })}
            </div>
            <label htmlFor="node-title">
              {kind === 'question' ? '궁금한 내용' : '제목'}
              <Input
                id="node-title"
                placeholder={
                  kind === 'question'
                    ? '예: 어텐션에서는 왜 Q, K, V가 필요할까요?'
                    : '새로운 개념의 이름을 입력합니다.'
                }
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={120}
                autoFocus
                disabled={busy}
              />
            </label>
            <label htmlFor="node-summary">
              한 줄 메모 <span className="font-normal text-muted-foreground">(선택)</span>
              <Textarea
                id="node-summary"
                placeholder="기억할 내용이나 질문의 맥락을 적습니다."
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={400}
                disabled={busy}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!title.trim() || busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : <GitBranch />}가지 추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SearchDialog({
  open,
  onOpenChange,
  project,
  onSelect,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  project: Project | null
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const value = query.toLocaleLowerCase().trim()
    return (project?.nodes ?? [])
      .filter((node) =>
        `${node.title} ${node.summary} ${node.tags.join(' ')} ${project?.documents[node.id] ?? ''}`
          .toLocaleLowerCase()
          .includes(value),
      )
      .sort((left, right) => {
        const rank = (title: string) => {
          const normalized = title.toLocaleLowerCase()
          return normalized === value ? 0 : normalized.includes(value) ? 1 : 2
        }
        return rank(left.title) - rank(right.title)
      })
      .slice(0, 30)
  }, [project, query])
  const select = (id: string) => {
    onSelect(id)
    onOpenChange(false)
    setQuery('')
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="search-dialog sm:max-w-[540px]">
        <DialogHeader className="sr-only">
          <DialogTitle>개념 검색</DialogTitle>
          <DialogDescription>현재 학습 공간의 개념과 문서를 검색합니다.</DialogDescription>
        </DialogHeader>
        <div className="search-input">
          <Search size={19} />
          <Input
            aria-label="개념과 문서 검색"
            placeholder="어떤 개념이 궁금하신가요?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) select(results[0].id)
            }}
            autoFocus
          />
        </div>
        <div className="search-results">
          <p>{project?.title ?? '학습 공간을 먼저 선택해 주십시오.'}</p>
          {results.length ? (
            results.map((node) => {
              const Icon = kinds[node.kind].icon
              return (
                <button key={node.id} onClick={() => select(node.id)}>
                  <Icon size={17} />
                  <span>
                    <strong>{node.title}</strong>
                    <small>{node.summary}</small>
                  </span>
                  <ArrowRight size={14} />
                </button>
              )
            })
          ) : (
            <div className="search-empty">검색 결과가 없습니다.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[510px]">
        <DialogHeader>
          <div className="dialog-symbol">
            <BookOpen />
          </div>
          <DialogTitle>질문에서 이해까지, 한 가지씩.</DialogTitle>
          <DialogDescription>학습 내용을 연결하고 전체 흐름을 살펴봅니다.</DialogDescription>
        </DialogHeader>
        <div className="help-sections">
          <section>
            <GitBranch />
            <div>
              <h3>개념에서 질문을 연결합니다.</h3>
              <p>
                카드의 + 버튼으로 가지를 추가합니다. 카드 양옆의 점을 연결하면 기존 개념 사이에도
                관계가 생깁니다.
              </p>
            </div>
          </section>
          <section>
            <StickyNote />
            <div>
              <h3>파일이 곧 학습 기록입니다.</h3>
              <p>
                <code>knowledge/프로젝트/graph.json</code>에 개념과 연결을,{' '}
                <code>documents/*.md</code>에 설명을 저장합니다. 파일 변경은 자동으로 반영됩니다.
              </p>
            </div>
          </section>
          <section>
            <CircleHelp />
            <div>
              <h3>Codex와 공부를 이어갑니다.</h3>
              <p>
                이 채팅에서 주제와 질문을 알려주시면 해당 프로젝트의 문서와 지도를 함께 확장할 수
                있습니다.
              </p>
            </div>
          </section>
          <section>
            <Keyboard />
            <div>
              <h3>캔버스 단축키</h3>
              <dl className="shortcut-list">
                <div>
                  <dt>개념 검색</dt>
                  <dd>⌘ / Ctrl + K</dd>
                </div>
                <div>
                  <dt>이동</dt>
                  <dd>Space + 드래그</dd>
                </div>
                <div>
                  <dt>선택 / 이동 도구</dt>
                  <dd>V / H</dd>
                </div>
                <div>
                  <dt>확대 / 축소</dt>
                  <dd>핀치 또는 하단 + / −</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

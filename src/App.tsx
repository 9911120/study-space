import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  GitBranch,
  LoaderCircle,
  Plus,
  RefreshCw,
  Shapes,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import {
  CreateNodeDialog,
  CreateProjectDialog,
  HelpDialog,
  SearchDialog,
} from '@/components/workspace-dialogs'
import { useWorkspace } from '@/hooks/use-workspace'
import { statuses } from '@/lib/presentation'
import type { NodeKind, NodeStatus, Project, ProjectList } from '../shared/schema'

const KnowledgeCanvas = lazy(() =>
  import('@/components/knowledge-canvas').then((module) => ({ default: module.KnowledgeCanvas })),
)
const DocumentPanel = lazy(() =>
  import('@/components/document-panel').then((module) => ({ default: module.DocumentPanel })),
)

export default function App() {
  const workspace = useWorkspace()
  const { project, activeId, list, loading, error, saving, connected, selectProject, mutate } =
    workspace
  const [overview, setOverview] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<NodeStatus | 'all'>('all')
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newNode, setNewNode] = useState<{ parentId?: string } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const selectedNode = project?.nodes.find((node) => node.id === selectedId)
  const openProject = (id: string) => {
    selectProject(id)
    setOverview(false)
    setSelectedId(null)
    setFilter('all')
  }
  const branch = useCallback((parentId?: string) => setNewNode({ parentId }), [])
  const patch = useCallback((body: Record<string, unknown>) => mutate('/graph', body), [mutate])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  const createNode = async (input: { title: string; summary: string; kind: NodeKind }) => {
    const previousIds = new Set(project?.nodes.map((node) => node.id))
    const updated = await mutate(
      '/nodes',
      { ...input, ...(newNode?.parentId ? { parentId: newNode.parentId } : {}) },
      'POST',
    )
    if (!updated) return false
    setFilter('all')
    setSelectedId(updated.nodes.find((node) => !previousIds.has(node.id))?.id ?? null)
    toast.success('새로운 생각을 연결했습니다.')
    return true
  }
  const exportProject = () => {
    if (!project) return
    const { revision: _revision, documents, ...graph } = project
    const file = new Blob([JSON.stringify({ graph, documents }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.id}-study-space.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('학습 기록을 내보냈습니다.')
  }
  const understood = project?.nodes.filter((node) => node.status === 'understood').length ?? 0
  const progress = project?.nodes.length ? Math.round((understood / project.nodes.length) * 100) : 0
  return (
    <TooltipProvider delayDuration={250}>
      <SidebarProvider
        style={{ '--sidebar-width': '240px' } as React.CSSProperties}
        className="app-shell"
      >
        <AppSidebar
          list={list}
          activeId={activeId}
          overview={overview}
          connected={connected}
          onSelect={openProject}
          onOverview={() => setOverview(true)}
          onQuestions={() => {
            setOverview(false)
            setFilter('question')
            setSelectedId(null)
          }}
          onNew={() => setNewProjectOpen(true)}
          onSearch={() => setSearchOpen(true)}
          onHelp={() => setHelpOpen(true)}
        />
        <SidebarInset className="workspace-main">
          <header className="workspace-header">
            <div className="flex min-w-0 items-center gap-2.5">
              <SidebarTrigger className="text-muted-foreground" />
              <span className="header-divider" />
              <button className="breadcrumb-home" onClick={() => setOverview(true)}>
                내 학습 공간
              </button>
              <ChevronRight size={13} className="shrink-0 text-muted-foreground/50" />
              <span className="truncate text-xs font-medium">
                {overview ? '모든 학습' : (project?.title ?? 'Study Space')}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="save-indicator" role="status">
                {saving ? (
                  <LoaderCircle size={12} className="animate-spin" />
                ) : connected ? (
                  <Check size={12} />
                ) : (
                  <RefreshCw size={12} />
                )}
                {saving ? '저장 중' : connected ? '파일과 동기화됨' : '다시 연결 중'}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="사용 가이드"
                onClick={() => setHelpOpen(true)}
              >
                <CircleHelp size={16} />
              </Button>
            </div>
          </header>
          {overview ? (
            <Overview list={list} onSelect={openProject} onNew={() => setNewProjectOpen(true)} />
          ) : (
            <>
              {project && (
                <section className="project-heading">
                  <div className="project-heading-main">
                    <span className={`project-icon ${project.color}`}>
                      <GitBranch size={23} />
                    </span>
                    <div className="min-w-0">
                      <div className="eyebrow mb-1.5">MY LEARNING CANVAS</div>
                      <h1>{project.title}</h1>
                      <p>{project.description}</p>
                    </div>
                  </div>
                  <div className="project-heading-actions">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="학습 기록 내보내기"
                      onClick={exportProject}
                    >
                      <Download size={15} />
                    </Button>
                    <Button disabled={saving || Boolean(error)} onClick={() => branch()}>
                      <Plus />
                      개념 추가
                    </Button>
                  </div>
                </section>
              )}
              {project && (
                <div className="canvas-subheader">
                  <div className="filter-tabs" role="group" aria-label="학습 상태 필터">
                    <button
                      className={filter === 'all' ? 'active' : ''}
                      aria-pressed={filter === 'all'}
                      onClick={() => setFilter('all')}
                    >
                      전체 지도 <span>{project.nodes.length}</span>
                    </button>
                    {(['exploring', 'question', 'understood'] as const).map((status) => (
                      <button
                        key={status}
                        className={filter === status ? 'active' : ''}
                        aria-pressed={filter === status}
                        onClick={() => setFilter(status)}
                      >
                        {statuses[status].label}
                        <span>{project.nodes.filter((node) => node.status === status).length}</span>
                      </button>
                    ))}
                  </div>
                  <div className="learning-progress">
                    <span>
                      {understood}
                      <span className="text-muted-foreground/60">
                        {' '}
                        / {project.nodes.length} 이해함
                      </span>
                    </span>
                    <div className="progress-track">
                      <div style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="error-banner" role="alert">
                  <CircleHelp size={16} />
                  <span>{error}</span>
                  <Button variant="outline" size="xs" onClick={() => void workspace.refresh()}>
                    <RefreshCw size={12} />
                    다시 불러오기
                  </Button>
                </div>
              )}
              {loading && !project ? (
                <Loading />
              ) : project ? (
                <div className="workspace-content">
                  <Suspense fallback={<Loading />}>
                    <KnowledgeCanvas
                      project={project}
                      selectedId={selectedId}
                      filter={filter}
                      saving={saving || Boolean(error)}
                      onSelect={setSelectedId}
                      onBranch={branch}
                      onPatch={patch}
                    />
                  </Suspense>
                  {selectedNode && (
                    <Suspense
                      fallback={
                        <div className="document-panel">
                          <Loading />
                        </div>
                      }
                    >
                      <DocumentPanel
                        key={`${project.id}:${selectedNode.id}`}
                        project={project}
                        node={selectedNode}
                        saving={saving || Boolean(error)}
                        onClose={() => setSelectedId(null)}
                        onBranch={branch}
                        onSelect={setSelectedId}
                        onStatus={(id, status) => {
                          void patch({ statuses: [{ id, status }] })
                        }}
                        onSave={(id, content, revision) =>
                          mutate(`/documents/${id}`, { content }, 'PUT', revision)
                        }
                      />
                    </Suspense>
                  )}
                </div>
              ) : (
                !error && (
                  <Overview
                    list={list}
                    onSelect={openProject}
                    onNew={() => setNewProjectOpen(true)}
                  />
                )
              )}
              {project && (
                <footer className="workspace-footer">
                  <span>
                    <span className="footer-dot" />
                    {project.nodes.length}개의 개념 <span className="mx-1.5 text-border">/</span>
                    {project.edges.length}개의 연결
                  </span>
                  <button onClick={() => setHelpOpen(true)}>
                    <KeyboardHint /> <span>단축키</span>
                  </button>
                </footer>
              )}
            </>
          )}
        </SidebarInset>
      </SidebarProvider>
      <CreateProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreate={async (input) => {
          await workspace.createProject(input)
          setOverview(false)
          setSelectedId(null)
          setFilter('all')
        }}
      />
      {newNode && (
        <CreateNodeDialog
          key={`${activeId}:${newNode.parentId ?? 'root'}`}
          open
          onOpenChange={(open) => {
            if (!open) setNewNode(null)
          }}
          parentTitle={project?.nodes.find((node) => node.id === newNode.parentId)?.title}
          onCreate={createNode}
        />
      )}
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        project={project}
        onSelect={(id) => {
          setOverview(false)
          setFilter('all')
          setSelectedId(id)
        }}
      />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <Toaster position="top-center" theme="light" />
    </TooltipProvider>
  )
}

function KeyboardHint() {
  return <span className="keyboard-hint">⌘</span>
}
function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="animate-spin" size={23} />
      <span>학습 공간을 불러옵니다.</span>
    </div>
  )
}
function Overview({
  list,
  onSelect,
  onNew,
}: {
  list: ProjectList
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const count = list.projects.reduce((total, project) => total + project.nodeCount, 0)
  return (
    <div className="overview">
      <div className="overview-intro">
        <span className="eyebrow">YOUR CURIOSITY, CONNECTED</span>
        <h1>
          질문을 펼치면,
          <br />
          <span>이해가 연결됩니다.</span>
        </h1>
        <p>하나의 개념에서 시작하는 나만의 학습 지도.</p>
        <Button size="lg" onClick={onNew}>
          <Plus />새 학습 시작
        </Button>
        <div className="overview-orbit" aria-hidden="true">
          <div className="orbit-line" />
          <span className="orbit-node n1">
            <BookOpen />
          </span>
          <span className="orbit-node n2">
            <CircleHelp />
          </span>
          <span className="orbit-node n3">
            <Shapes />
          </span>
          <span className="orbit-center">
            <GitBranch size={45} />
          </span>
        </div>
      </div>
      <div className="overview-section-title">
        <h2>
          내 학습 공간 <span>{list.projects.length}</span>
        </h2>
        <span>지금까지 {count}개의 생각을 연결했습니다.</span>
      </div>
      <div className="project-grid">
        {list.projects.map((project) => {
          const percent = project.nodeCount
            ? Math.round((project.understoodCount / project.nodeCount) * 100)
            : 0
          return (
            <button key={project.id} className="project-card" onClick={() => onSelect(project.id)}>
              <div className="project-card-top">
                <span className={`project-icon ${project.color}`}>
                  <GitBranch size={22} />
                </span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{project.title}</h3>
              <p>{project.description || '새로운 질문을 이어갑니다.'}</p>
              <div className="project-card-stats">
                <span>{project.nodeCount}개 개념</span>
                <span>{project.questionCount}개 질문</span>
              </div>
              <div className="progress-track">
                <div style={{ width: `${percent}%` }} />
              </div>
              <div className="project-card-bottom">
                <span>{percent}% 이해함</span>
                <ArrowRight size={14} />
              </div>
            </button>
          )
        })}
        <button className="new-project-card" onClick={onNew}>
          <span>
            <Plus size={24} />
          </span>
          <strong>다음 호기심을 펼쳐봅니다.</strong>
          <small>새로운 학습 공간 만들기</small>
        </button>
      </div>
      {list.errors.length > 0 && (
        <div className="overview-errors">
          {list.errors.map((error) => (
            <button key={error.id} onClick={() => onSelect(error.id)}>
              <CircleHelp size={14} />
              {error.message}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { lazy, Suspense, useState } from 'react'
import { LoaderCircle, Moon, Sun } from 'lucide-react'
import { ThemeProvider, useTheme } from 'next-themes'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useWorkspace } from '@/hooks/use-workspace'

const KnowledgeCanvas = lazy(() =>
  import('@/components/knowledge-canvas').then((module) => ({ default: module.KnowledgeCanvas })),
)
const DocumentPanel = lazy(() =>
  import('@/components/document-panel').then((module) => ({ default: module.DocumentPanel })),
)

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="study-space:theme"
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={300}>
        <Workspace />
      </TooltipProvider>
    </ThemeProvider>
  )
}

function Workspace() {
  const { project, activeId, list, loading, error, connectionError, selectProject, refresh } =
    useWorkspace()
  const [selection, setSelection] = useState<{ projectId: string; nodeId: string } | null>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const selectedId = selection?.projectId === project?.id ? (selection?.nodeId ?? null) : null
  const selectedNode = project?.nodes.find((node) => node.id === selectedId)
  const dark = resolvedTheme === 'dark'
  const onSelect = (nodeId: string | null) =>
    setSelection(project && nodeId ? { projectId: project.id, nodeId } : null)

  return (
    <SidebarProvider
      style={{ '--sidebar-width': '216px' } as React.CSSProperties}
      className="app-shell"
    >
      <AppSidebar
        list={list}
        activeId={activeId}
        onSelect={(id) => {
          selectProject(id)
          setSelection(null)
        }}
      />
      <SidebarInset className="workspace-main">
        <header className="workspace-header">
          <div className="header-title">
            <SidebarTrigger />
            <span className="header-divider" />
            <h1>{project?.title ?? 'Study Space'}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            title={dark ? '라이트 모드' : '다크 모드'}
            onClick={() => setTheme(dark ? 'light' : 'dark')}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </header>
        {(error || connectionError) && (
          <div className="error-banner" role="alert">
            <span>{error ?? connectionError}</span>
            <Button variant="ghost" size="sm" onClick={() => void refresh()}>
              다시 불러오기
            </Button>
          </div>
        )}
        {loading && !project ? (
          <Loading />
        ) : project ? (
          <div className="workspace-content">
            <Suspense fallback={<Loading />}>
              <KnowledgeCanvas project={project} selectedId={selectedId} onSelect={onSelect} />
            </Suspense>
            {selectedNode && (
              <Suspense
                fallback={
                  <aside className="document-panel">
                    <Loading />
                  </aside>
                }
              >
                <DocumentPanel
                  key={`${project.id}:${selectedNode.id}`}
                  node={selectedNode}
                  content={project.documents[selectedNode.id] ?? ''}
                  onClose={() => onSelect(null)}
                />
              </Suspense>
            )}
          </div>
        ) : (
          !error && <div className="empty-state">아직 학습 문서가 없습니다.</div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="animate-spin" size={20} />
      <span className="sr-only">문서를 불러옵니다.</span>
    </div>
  )
}

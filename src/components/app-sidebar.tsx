import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Plus,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import type { ProjectList } from '../../shared/schema'

type Props = {
  list: ProjectList
  activeId: string | null
  overview: boolean
  connected: boolean
  onSelect: (id: string) => void
  onOverview: () => void
  onQuestions: () => void
  onNew: () => void
  onSearch: () => void
  onHelp: () => void
}

// shadcn sidebar-07 블록을 학습 프로젝트 탐색에 맞게 구성합니다.
export function AppSidebar({
  list,
  activeId,
  overview,
  connected,
  onSelect,
  onOverview,
  onQuestions,
  onNew,
  onSearch,
  onHelp,
}: Props) {
  const { setOpenMobile } = useSidebar()
  const navigate = (action: () => void) => {
    action()
    setOpenMobile(false)
  }
  return (
    <Sidebar collapsible="icon" className="workspace-sidebar">
      <SidebarHeader className="gap-5 px-4 pt-6 pb-4">
        <button
          className="brand flex items-center gap-3 text-left"
          onClick={() => navigate(onOverview)}
          aria-label="Study Space 홈"
        >
          <span className="brand-mark">
            <GitBranch size={22} strokeWidth={2.4} />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            <strong className="block text-[17px] tracking-tight">
              study space<span className="text-primary">.</span>
            </strong>
            <span className="text-[10px] tracking-[0.18em] text-muted-foreground">
              A PLACE FOR CURIOSITY
            </span>
          </span>
        </button>
        <Button
          variant="outline"
          className="sidebar-search h-9 justify-start text-muted-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
          onClick={onSearch}
        >
          <Search />
          <span className="group-data-[collapsible=icon]:hidden">개념 검색</span>
          <kbd className="ml-auto text-[10px] group-data-[collapsible=icon]:hidden">⌘ K</kbd>
        </Button>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={overview}
                tooltip="모든 학습"
                onClick={() => navigate(onOverview)}
              >
                <LayoutGrid />
                <span>모든 학습</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {list.projects.length}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="열린 질문" onClick={() => navigate(onQuestions)}>
                <CircleHelp />
                <span>열린 질문</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {list.projects.find((item) => item.id === activeId)?.questionCount ?? 0}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="mb-2 flex justify-between text-[10px] tracking-wider">
            내 학습 공간{' '}
            <Button size="icon-xs" variant="ghost" aria-label="새 학습 공간" onClick={onNew}>
              <Plus />
            </Button>
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1.5">
            {list.projects.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  tooltip={item.title}
                  className="project-nav h-11"
                  isActive={!overview && activeId === item.id}
                  onClick={() => navigate(() => onSelect(item.id))}
                >
                  <span className={`project-dot ${item.color}`} />
                  <span className="truncate text-[12px]">{item.title}</span>
                  {activeId === item.id && !overview && <ChevronRight className="ml-auto size-3" />}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {list.errors.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  tooltip={item.message}
                  onClick={() => navigate(() => onSelect(item.id))}
                >
                  <CircleHelp className="text-destructive" />
                  <span className="truncate">{item.id}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton
                className="mt-2 text-muted-foreground"
                tooltip="새 학습 시작"
                onClick={onNew}
              >
                <Plus />
                <span>새 학습 시작</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <div className="curiosity-note mx-2 mt-auto mb-5 group-data-[collapsible=icon]:hidden">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen size={15} />
            <span className="text-xs font-medium">작은 질문, 더 깊은 이해</span>
          </div>
          <p>
            모르는 개념에서
            <br />
            새로운 배움이 시작됩니다.
          </p>
          <button onClick={onHelp} className="mt-4 flex items-center gap-1 text-[11px] font-medium">
            사용 가이드 <ArrowUpRight size={12} />
          </button>
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className={`connection-dot ${connected ? 'online' : ''}`} />
          <span className="text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
            {connected ? '로컬 파일 연결됨' : '연결 확인 중'}
          </span>
          <FolderOpen
            size={13}
            className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden"
          />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

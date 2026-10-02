import { AlertCircle, FileText, PanelsTopLeft } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import type { ProjectList } from '../../shared/schema'

type Props = { list: ProjectList; activeId: string | null; onSelect: (id: string) => void }

// shadcn sidebar-07의 프로젝트 탐색 구조를 사용합니다.
export function AppSidebar({ list, activeId, onSelect }: Props) {
  const { setOpenMobile } = useSidebar()
  const select = (id: string) => {
    onSelect(id)
    setOpenMobile(false)
  }
  return (
    <Sidebar collapsible="icon" className="workspace-sidebar">
      <SidebarHeader className="sidebar-brand">
        <PanelsTopLeft size={19} />
        <span className="group-data-[collapsible=icon]:hidden">Study Space</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {list.projects.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton
                  isActive={activeId === project.id}
                  tooltip={project.title}
                  onClick={() => select(project.id)}
                >
                  <FileText />
                  <span>{project.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {list.errors.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton
                  isActive={activeId === project.id}
                  tooltip={project.message}
                  onClick={() => select(project.id)}
                >
                  <AlertCircle />
                  <span>{project.id}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

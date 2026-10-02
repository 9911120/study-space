import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError, readStorage, writeStorage } from '@/lib/api'
import type { Project, ProjectList, ProjectInput } from '../../shared/schema'

const hashProject = () => new URLSearchParams(location.hash.slice(1)).get('project')
export function useWorkspace() {
  const [list, setList] = useState<ProjectList>({ projects: [], errors: [] })
  const [activeId, setActiveId] = useState<string | null>(
    hashProject() ?? readStorage('study-space:project'),
  )
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(false)
  const activeRef = useRef(activeId)
  const projectRef = useRef(project)
  const sequence = useRef(0)
  const saveLock = useRef(false)
  const selectProject = useCallback((id: string) => {
    if (activeRef.current === id) return
    activeRef.current = id
    projectRef.current = null
    setProject(null)
    setActiveId(id)
    setLoading(true)
    setError(null)
    writeStorage('study-space:project', id)
    history.replaceState(null, '', `#project=${encodeURIComponent(id)}`)
  }, [])
  const refresh = useCallback(async () => {
    const ticket = ++sequence.current
    const id = activeRef.current
    try {
      const [nextList, nextProject] = await Promise.all([
        api<ProjectList>('/projects'),
        id ? api<Project>(`/projects/${encodeURIComponent(id)}`) : Promise.resolve(null),
      ])
      if (ticket !== sequence.current || id !== activeRef.current) return
      setList(nextList)
      setError(null)
      if (nextProject) {
        projectRef.current = nextProject
        setProject((previous) =>
          previous?.revision === nextProject.revision ? previous : nextProject,
        )
      } else if (nextList.projects[0]) selectProject(nextList.projects[0].id)
    } catch (reason) {
      if (ticket !== sequence.current || id !== activeRef.current) return
      setError(reason instanceof Error ? reason.message : '프로젝트를 불러오지 못했습니다.')
      try {
        const nextList = await api<ProjectList>('/projects')
        if (ticket === sequence.current) setList(nextList)
      } catch {
        /* 기존 목록을 유지합니다. */
      }
    } finally {
      if (ticket === sequence.current) setLoading(false)
    }
  }, [selectProject])
  useEffect(() => {
    void refresh()
  }, [activeId, refresh])
  useEffect(() => {
    const events = new EventSource('/api/events')
    const ready = () => {
      setConnected(true)
      void refresh()
    }
    const change = () => {
      void refresh()
    }
    const failure = () => setConnected(false)
    events.addEventListener('ready', ready)
    events.addEventListener('change', change)
    events.addEventListener('watch-error', failure)
    events.onerror = failure
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', visible)
    const hashChange = () => {
      const id = hashProject()
      if (id) selectProject(id)
    }
    window.addEventListener('hashchange', hashChange)
    return () => {
      ++sequence.current
      events.close()
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('hashchange', hashChange)
    }
  }, [refresh, selectProject])
  const mutate = useCallback(
    async (route: string, body: Record<string, unknown>, method = 'PATCH', revision?: string) => {
      const current = projectRef.current
      if (!current || saveLock.current) return null
      saveLock.current = true
      setSaving(true)
      try {
        const updated = await api<Project>(`/projects/${current.id}${route}`, {
          method,
          body: JSON.stringify({ ...body, revision: revision ?? current.revision }),
        })
        if (activeRef.current === updated.id) {
          ++sequence.current
          projectRef.current = updated
          setProject(updated)
          setError(null)
        }
        void refresh()
        return updated
      } catch (reason) {
        toast.error(reason instanceof Error ? reason.message : '저장하지 못했습니다.')
        if (reason instanceof ApiError && reason.status === 409) void refresh()
        return null
      } finally {
        saveLock.current = false
        setSaving(false)
      }
    },
    [refresh],
  )
  const createProject = useCallback(
    async (input: ProjectInput) => {
      const created = await api<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      selectProject(created.id)
      toast.success('새 학습 공간을 만들었습니다.')
      return created
    },
    [selectProject],
  )
  return {
    list,
    project,
    activeId,
    loading,
    error,
    saving,
    connected,
    selectProject,
    refresh,
    mutate,
    createProject,
  }
}

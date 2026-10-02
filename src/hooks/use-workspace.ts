import { useCallback, useEffect, useRef, useState } from 'react'
import { api, readStorage, writeStorage } from '@/lib/api'
import type { Project, ProjectList } from '../../shared/schema'

const hashProject = () => new URLSearchParams(location.hash.slice(1)).get('project')
export function useWorkspace() {
  const [list, setList] = useState<ProjectList>({ projects: [], errors: [] })
  const [activeId, setActiveId] = useState<string | null>(
    hashProject() || readStorage('study-space:project') || null,
  )
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const activeRef = useRef(activeId)
  const sequence = useRef(0)
  const selectProject = useCallback((id: string | null) => {
    if (activeRef.current === id) return
    activeRef.current = id
    ++sequence.current
    setProject(null)
    setActiveId(id)
    setLoading(true)
    setError(null)
    writeStorage('study-space:project', id ?? '')
    history.replaceState(
      null,
      '',
      id ? `#project=${encodeURIComponent(id)}` : `${location.pathname}${location.search}`,
    )
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
        setProject((previous) =>
          previous?.revision === nextProject.revision ? previous : nextProject,
        )
      } else if (nextList.projects[0]) selectProject(nextList.projects[0].id)
    } catch (reason) {
      if (ticket !== sequence.current || id !== activeRef.current) return
      setError(reason instanceof Error ? reason.message : '프로젝트를 불러오지 못했습니다.')
      try {
        const nextList = await api<ProjectList>('/projects')
        if (ticket === sequence.current) {
          setList(nextList)
          const stillExists =
            nextList.projects.some((item) => item.id === id) ||
            nextList.errors.some((item) => item.id === id)
          // 삭제된 프로젝트는 남은 프로젝트로 전환합니다. 손상된 파일은 오류를 유지합니다.
          if (id && !stillExists) selectProject(nextList.projects[0]?.id ?? null)
        }
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
      setConnectionError(null)
      void refresh()
    }
    const change = () => {
      void refresh()
    }
    const failure = () => setConnectionError('실시간 연결이 끊겼습니다. 다시 연결합니다.')
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
  useEffect(() => {
    if (!connectionError) return
    const timer = setInterval(() => {
      void refresh()
    }, 5000)
    return () => clearInterval(timer)
  }, [connectionError, refresh])
  return { list, project, activeId, loading, error, connectionError, selectProject, refresh }
}

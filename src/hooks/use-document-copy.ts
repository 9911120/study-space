import { useCallback, useEffect, useRef, useState } from 'react'
import type { KnowledgeNode, Project } from '../../shared/schema'

type CopyResult = { identifier: string; status: 'copied' | 'error' }

const documentIdentifier = (projectId: string, node: KnowledgeNode) =>
  `knowledge/${projectId}/documents/${node.document}`

export function useDocumentCopy(project: Project | null, selectedNode?: KnowledgeNode) {
  const identifier = project && selectedNode ? documentIdentifier(project.id, selectedNode) : null
  const [result, setResult] = useState<CopyResult | null>(null)
  const request = useRef(0)

  useEffect(() => {
    if (!result) return
    const timer = window.setTimeout(() => setResult(null), 2500)
    return () => window.clearTimeout(timer)
  }, [result])

  const copy = useCallback(async (value: string, event?: ClipboardEvent) => {
    const ticket = ++request.current
    try {
      if (event?.clipboardData) {
        event.clipboardData.setData('text/plain', value)
        event.preventDefault()
      } else {
        await navigator.clipboard.writeText(value)
      }
      if (ticket === request.current) setResult({ identifier: value, status: 'copied' })
    } catch {
      if (ticket === request.current) setResult({ identifier: value, status: 'error' })
    }
  }, [])

  useEffect(() => {
    if (!project) return
    const onCopy = (event: ClipboardEvent) => {
      if (event.defaultPrevented || window.getSelection()?.toString()) return
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('input, textarea, select') || target.isContentEditable) return
      if (target !== document.body && !target.closest('.workspace-content')) return

      // 키보드로 다른 노드에 포커스를 옮겼다면 그 문서를 우선합니다.
      const focusedId = target.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId
      const focusedNode = project.nodes.find((node) => node.id === focusedId)
      const value = focusedNode ? documentIdentifier(project.id, focusedNode) : identifier
      if (value) void copy(value, event)
    }
    document.addEventListener('copy', onCopy)
    return () => document.removeEventListener('copy', onCopy)
  }, [project, identifier, copy])

  return {
    identifier,
    status: result?.identifier === identifier ? result.status : null,
    copy: () => {
      if (identifier) void copy(identifier)
    },
  }
}

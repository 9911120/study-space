import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { Graph, KnowledgeNode } from '../../shared/schema'

export type StudyNode = Node<
  KnowledgeNode & { open: (id: string) => void },
  'concept' | 'studyGroup'
>

export function createCanvasGraph(
  graph: Graph,
  selectedId: string | null,
  open: (id: string) => void,
): { nodes: StudyNode[]; edges: Edge[] } {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const visited = new Set<string>()
  const nodes: StudyNode[] = []
  function append(node: KnowledgeNode) {
    if (visited.has(node.id)) return
    visited.add(node.id)
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) append(parent)
    nodes.push({
      id: node.id,
      type: node.kind === 'group' ? 'studyGroup' : 'concept',
      parentId: node.parentId,
      position: node.position,
      selected: node.id === selectedId,
      style:
        node.kind === 'group' ? { width: node.size.width, height: node.size.height } : undefined,
      data: { ...node, open },
    })
  }
  graph.nodes.forEach(append)
  const edges: Edge[] = graph.edges.map(({ id, source, target, relation }) => ({
    id,
    source,
    target,
    sourceHandle: relation === 'sequence' ? 'sequence-out' : 'hierarchy-out',
    targetHandle: relation === 'sequence' ? 'sequence-in' : 'hierarchy-in',
    type: 'smoothstep',
    className: `relation-${relation}`,
    // 그룹 배경보다 위에 선을 표시합니다.
    zIndex: 1,
    markerEnd:
      relation === 'sequence'
        ? { type: MarkerType.ArrowClosed, color: 'var(--canvas-sequence)', width: 16, height: 16 }
        : undefined,
    style: {
      stroke: relation === 'sequence' ? 'var(--canvas-sequence)' : 'var(--canvas-edge)',
      strokeWidth: relation === 'sequence' ? 1.6 : 1.2,
    },
  }))
  return { nodes, edges }
}

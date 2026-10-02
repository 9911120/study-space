import { memo, useEffect, useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useOnViewportChange,
  useReactFlow,
  useStore,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readStorage, writeStorage } from '@/lib/api'
import type { KnowledgeNode, Project } from '../../shared/schema'
import '@xyflow/react/dist/style.css'

type ConceptData = KnowledgeNode & { open: (id: string) => void }
type ConceptFlowNode = Node<ConceptData, 'concept'>
type Props = { project: Project; selectedId: string | null; onSelect: (id: string | null) => void }

const ConceptCard = memo(function ConceptCard({ data, selected }: NodeProps<ConceptFlowNode>) {
  return (
    <div className={`concept-node ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <button
        className="concept-card nodrag"
        onClick={() => data.open(data.id)}
        aria-pressed={selected}
      >
        <span className="concept-title">{data.title}</span>
        {data.summary && <span className="concept-summary">{data.summary}</span>}
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
})
const nodeTypes = { concept: ConceptCard }

function CanvasInner({ project, selectedId, onSelect }: Props) {
  const flow = useReactFlow<ConceptFlowNode>()
  const width = useStore((state) => state.width)
  const initialized = useNodesInitialized()
  const zoom = useStore((state) => Math.round(state.transform[2] * 100))
  const nodes = useMemo(
    (): ConceptFlowNode[] =>
      project.nodes.map((node) => ({
        id: node.id,
        type: 'concept',
        position: node.position,
        selected: node.id === selectedId,
        data: { ...node, open: onSelect },
      })),
    [project.nodes, selectedId, onSelect],
  )
  const edges = useMemo(
    () =>
      project.edges.map(({ id, source, target }) => ({
        id,
        source,
        target,
        type: 'smoothstep',
        style: { stroke: 'var(--canvas-edge)', strokeWidth: 1.25 },
      })),
    [project.edges],
  )
  const storageKey = `study-space:viewport:${project.id}`
  const viewport = useMemo(() => {
    try {
      const value = JSON.parse(readStorage(storageKey) ?? 'null')
      if (
        value &&
        ['x', 'y', 'zoom'].every((key) => Number.isFinite(value[key])) &&
        value.zoom >= 0.15 &&
        value.zoom <= 2
      )
        return value
    } catch {
      /* 기본 화면 범위로 표시합니다. */
    }
    return undefined
  }, [storageKey])
  useOnViewportChange({
    onEnd: (value) => writeStorage(storageKey, JSON.stringify(value)),
  })
  useEffect(() => {
    if (!selectedId || !initialized) return
    const node = flow.getNode(selectedId)
    if (node)
      void flow.setCenter(
        node.position.x + 140,
        node.position.y + (node.measured?.height ?? 130) / 2,
        { zoom: Math.max(flow.getZoom(), 0.9), duration: 200 },
      )
  }, [selectedId, initialized, width, flow])

  return (
    <div className="canvas-surface" aria-label="학습 캔버스">
      <ReactFlow<ConceptFlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        fitView={!viewport}
        defaultViewport={viewport}
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.15}
        maxZoom={2}
        panOnScroll
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch
        deleteKeyCode={null}
        selectionKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} color="var(--canvas-dot)" gap={24} size={1} />
        <Panel position="bottom-right" className="canvas-controls">
          <Button
            variant="ghost"
            size="icon"
            aria-label="축소"
            title="축소"
            onClick={() => void flow.zoomOut({ duration: 150 })}
          >
            <Minus />
          </Button>
          <button
            className="zoom-value"
            aria-label="100% 크기로 보기"
            title="100% 크기로 보기"
            onClick={() => void flow.zoomTo(1, { duration: 150 })}
          >
            {zoom}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="확대"
            title="확대"
            onClick={() => void flow.zoomIn({ duration: 150 })}
          >
            <Plus />
          </Button>
          <span className="control-divider" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="전체 보기"
            title="전체 보기"
            onClick={() => void flow.fitView({ padding: 0.2, duration: 200 })}
          >
            <Maximize />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function KnowledgeCanvas(props: Props) {
  return (
    <ReactFlowProvider key={props.project.id}>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

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
  type NodeProps,
} from '@xyflow/react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readStorage, writeStorage } from '@/lib/api'
import { createCanvasGraph, type StudyNode } from '@/lib/canvas-graph'
import type { Project } from '../../shared/schema'
import '@xyflow/react/dist/style.css'

type Props = { project: Project; selectedId: string | null; onSelect: (id: string | null) => void }

function RelationHandles() {
  return (
    <>
      <Handle id="sequence-in" type="target" position={Position.Left} isConnectable={false} />
      <Handle id="sequence-out" type="source" position={Position.Right} isConnectable={false} />
      <Handle id="hierarchy-in" type="target" position={Position.Top} isConnectable={false} />
      <Handle id="hierarchy-out" type="source" position={Position.Bottom} isConnectable={false} />
    </>
  )
}

const ConceptCard = memo(function ConceptCard({ data, selected }: NodeProps<StudyNode>) {
  return (
    <div className={`concept-node ${selected ? 'is-selected' : ''}`}>
      <RelationHandles />
      <button
        className="concept-card nodrag"
        data-node-id={data.id}
        onClick={(event) => {
          event.stopPropagation()
          event.currentTarget.focus({ preventScroll: true })
          data.open(data.id)
        }}
        aria-pressed={selected}
      >
        <span className="concept-title">{data.title}</span>
        {data.summary && <span className="concept-summary">{data.summary}</span>}
      </button>
    </div>
  )
})
const StudyGroup = memo(function StudyGroup({ data, selected }: NodeProps<StudyNode>) {
  return (
    <div className={`study-group ${selected ? 'is-selected' : ''}`}>
      <RelationHandles />
      <button
        className="group-header nodrag"
        data-node-id={data.id}
        onClick={(event) => {
          event.stopPropagation()
          event.currentTarget.focus({ preventScroll: true })
          data.open(data.id)
        }}
        aria-pressed={selected}
      >
        <span className="group-title">{data.title}</span>
        {data.summary && <span className="group-summary">{data.summary}</span>}
      </button>
    </div>
  )
})
const nodeTypes = { concept: ConceptCard, studyGroup: StudyGroup }

function CanvasInner({ project, selectedId, onSelect }: Props) {
  const flow = useReactFlow<StudyNode>()
  const width = useStore((state) => state.width)
  const initialized = useNodesInitialized()
  const zoom = useStore((state) => Math.round(state.transform[2] * 100))
  const { nodes, edges } = useMemo(
    () => createCanvasGraph(project, selectedId, onSelect),
    [project, selectedId, onSelect],
  )
  const storageKey = `study-space:viewport:v2:${project.id}`
  const firstPosition = project.nodes.find((node) => !node.parentId)?.position ?? { x: 0, y: 0 }
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
    const node = flow.getInternalNode(selectedId)
    if (node)
      void flow.setCenter(
        node.internals.positionAbsolute.x +
          (node.type === 'studyGroup' ? 260 : (node.measured.width ?? 320) / 2),
        node.internals.positionAbsolute.y +
          (node.type === 'studyGroup' ? 65 : (node.measured.height ?? 180) / 2),
        { zoom: Math.max(flow.getZoom(), 0.9), duration: 200 },
      )
  }, [selectedId, initialized, width, flow])

  return (
    <div className="canvas-surface" aria-label="학습 캔버스">
      <ReactFlow<StudyNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => {
          onSelect(node.type === 'studyGroup' ? null : node.id)
        }}
        onPaneClick={() => onSelect(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        defaultViewport={
          viewport ?? { x: 40 - firstPosition.x * 0.85, y: 40 - firstPosition.y * 0.85, zoom: 0.85 }
        }
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

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useOnViewportChange,
  useStore,
  useNodesInitialized,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import {
  ArrowUpRight,
  Focus,
  Hand,
  LayoutGrid,
  Map,
  Minus,
  MousePointer2,
  Plus,
  Route,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { kinds, statuses } from '@/lib/presentation'
import { readStorage, writeStorage } from '@/lib/api'
import type { KnowledgeNode, Project, NodeStatus } from '../../shared/schema'
import '@xyflow/react/dist/style.css'

type ConceptData = KnowledgeNode & {
  dimmed: boolean
  isRoot: boolean
  branch: (id: string) => void
  open: (id: string) => void
  disabled: boolean
}
type ConceptFlowNode = Node<ConceptData, 'concept'>
type Props = {
  project: Project
  selectedId: string | null
  filter: NodeStatus | 'all'
  saving: boolean
  onSelect: (id: string | null) => void
  onBranch: (id?: string) => void
  onPatch: (body: Record<string, unknown>) => Promise<Project | null>
}

const ConceptCard = memo(function ConceptCard({ data, selected }: NodeProps<ConceptFlowNode>) {
  const KindIcon = kinds[data.kind].icon
  const status = statuses[data.status]
  const StatusIcon = status.icon
  return (
    <article
      className={`concept-card ${selected ? 'is-selected' : ''} ${data.isRoot ? 'is-root' : ''} ${data.kind === 'question' ? 'is-question' : ''} ${data.dimmed ? 'is-dimmed' : ''}`}
    >
      <Handle type="target" position={Position.Left} aria-label="들어오는 연결" />
      <div className="concept-topline">
        <span className="concept-kind">
          <KindIcon size={13} />
          {data.isRoot ? '시작하는 질문' : kinds[data.kind].label}
        </span>
        <ArrowUpRight size={13} className="text-muted-foreground/60" />
      </div>
      <h3>
        <button
          className="nodrag text-left"
          onClick={(event) => {
            event.stopPropagation()
            data.open(data.id)
          }}
        >
          {data.title}
        </button>
      </h3>
      <p>{data.summary || '이 개념의 설명을 작성합니다.'}</p>
      <div className="concept-footer">
        <span className={`status-label ${status.className}`}>
          <StatusIcon size={12} />
          {status.label}
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          className="nodrag nopan branch-button"
          aria-label={`${data.title}에서 가지 추가`}
          disabled={data.disabled}
          onClick={(event) => {
            event.stopPropagation()
            data.branch(data.id)
          }}
        >
          <Plus size={14} />
        </Button>
      </div>
      <Handle type="source" position={Position.Right} aria-label="새 연결" />
    </article>
  )
})
const nodeTypes = { concept: ConceptCard }

function Tool({
  label,
  active,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; active?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={active}
          className={active ? 'tool-active' : ''}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function CanvasInner({ project, selectedId, filter, saving, onSelect, onBranch, onPatch }: Props) {
  const [mode, setMode] = useState<'select' | 'pan'>('select')
  const [showMap, setShowMap] = useState(false)
  const [zoom, setZoom] = useState(100)
  const flow = useReactFlow<ConceptFlowNode>()
  const canvasWidth = useStore((state) => state.width)
  const nodesInitialized = useNodesInitialized()
  const incoming = useMemo(() => new Set(project.edges.map((edge) => edge.target)), [project.edges])
  const makeNodes = useCallback(
    (): ConceptFlowNode[] =>
      project.nodes.map((node) => ({
        id: node.id,
        type: 'concept',
        position: node.position,
        selected: node.id === selectedId,
        data: {
          ...node,
          isRoot: !incoming.has(node.id),
          dimmed: filter !== 'all' && node.status !== filter,
          branch: onBranch,
          open: onSelect,
          disabled: saving,
        },
      })),
    [project.nodes, selectedId, filter, incoming, onBranch, onSelect, saving],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptFlowNode>(makeNodes())
  useEffect(() => {
    setNodes(makeNodes())
  }, [makeNodes, setNodes])
  const edges = useMemo(
    () =>
      project.edges.map((edge) => ({
        ...edge,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#bdc8b6', strokeWidth: 1.5 },
        labelStyle: { fill: '#7c8777', fontSize: 10 },
        labelBgStyle: { fill: '#f8f9f6' },
        labelBgPadding: [7, 4] as [number, number],
        labelBgBorderRadius: 4,
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
    onChange: (value) => setZoom(Math.round(value.zoom * 100)),
    onEnd: (value) => writeStorage(storageKey, JSON.stringify(value)),
  })
  useEffect(() => {
    if (!selectedId) return
    const node = flow.getNode(selectedId)
    if (node)
      void flow.setCenter(node.position.x + 142, node.position.y + 96, {
        zoom: Math.max(flow.getZoom(), 0.85),
        duration: 300,
      })
  }, [selectedId, flow, canvasWidth, nodesInitialized])
  const arrange = async () => {
    const graph = new dagre.graphlib.Graph()
    graph.setGraph({ rankdir: 'LR', nodesep: 65, ranksep: 110 })
    graph.setDefaultEdgeLabel(() => ({}))
    project.nodes.forEach((node) => graph.setNode(node.id, { width: 284, height: 194 }))
    project.edges.forEach((edge) => graph.setEdge(edge.source, edge.target))
    dagre.layout(graph)
    const positions = project.nodes.map((node) => ({
      id: node.id,
      position: { x: graph.node(node.id).x - 142, y: graph.node(node.id).y - 97 },
    }))
    const updated = await onPatch({ positions })
    if (updated) {
      setNodes((previous) =>
        previous.map((node) => ({
          ...node,
          position: positions.find((item) => item.id === node.id)!.position,
        })),
      )
      requestAnimationFrame(() => {
        void flow.fitView({ padding: 0.15, duration: 350 })
      })
    }
  }
  const persistPositions = async (moved: ConceptFlowNode[]) => {
    if (!moved.length) return
    const result = await onPatch({
      positions: moved.map((node) => ({ id: node.id, position: node.position })),
    })
    if (!result) setNodes(makeNodes())
  }
  return (
    <div
      className="canvas-surface"
      aria-label="학습 개념 캔버스"
      onKeyDown={(event) => {
        const target = event.target as HTMLElement
        if (event.key === 'Enter' && target.matches('.react-flow__node')) {
          onSelect(target.dataset.id ?? null)
        }
      }}
      onKeyUp={(event) => {
        const target = event.target as HTMLElement
        if (
          event.key.startsWith('Arrow') &&
          target.matches('.react-flow__node, .react-flow__nodesselection-rect')
        ) {
          void persistPositions(flow.getNodes().filter((node) => node.selected))
        }
      }}
    >
      <ReactFlow<ConceptFlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_event, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onNodeDragStop={(_event, _node, draggedNodes) => {
          void persistPositions(draggedNodes)
        }}
        onSelectionDragStop={(_event, draggedNodes) => {
          void persistPositions(draggedNodes)
        }}
        onConnect={(connection) => {
          if (connection.source && connection.target)
            void onPatch({ edge: { source: connection.source, target: connection.target } })
        }}
        isValidConnection={(connection) =>
          connection.source !== connection.target &&
          !project.edges.some(
            (edge) => edge.source === connection.source && edge.target === connection.target,
          )
        }
        nodesDraggable={!saving}
        nodesConnectable={!saving}
        edgesReconnectable={false}
        fitView={!viewport}
        defaultViewport={viewport}
        fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
        minZoom={0.15}
        maxZoom={2}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        panOnDrag={mode === 'pan' ? true : [1, 2]}
        selectionOnDrag={mode === 'select'}
        panActivationKeyCode="Space"
        zoomActivationKeyCode="Meta"
        deleteKeyCode={null}
        selectionKeyCode="Shift"
        connectionRadius={30}
        ariaLabelConfig={{
          'node.a11yDescription.default': 'Enter로 개념을 선택합니다. 방향키로 이동할 수 있습니다.',
          'controls.zoomIn.ariaLabel': '확대',
          'controls.zoomOut.ariaLabel': '축소',
        }}
      >
        <Background variant={BackgroundVariant.Dots} color="#cdd3c7" gap={22} size={1} />
        <Panel position="top-left" className="canvas-label">
          <span className="inline-flex items-center gap-1.5">
            <Route size={13} /> 지식 지도
          </span>
          <span className="text-muted-foreground/50">/</span>
          <span>{project.nodes.length}개의 연결된 생각</span>
        </Panel>
        <Panel position="top-right">
          <Button
            variant="outline"
            className="canvas-action"
            disabled={saving || !project.nodes.length}
            onClick={() => void arrange()}
          >
            <LayoutGrid size={14} />
            자동 정렬
          </Button>
        </Panel>
        <Panel position="bottom-center" className="canvas-toolbar">
          <Tool label="선택 (V)" active={mode === 'select'} onClick={() => setMode('select')}>
            <MousePointer2 />
          </Tool>
          <Tool
            label="이동 (Space + 드래그)"
            active={mode === 'pan'}
            onClick={() => setMode('pan')}
          >
            <Hand />
          </Tool>
          <span className="tool-divider" />
          <Tool label="축소" onClick={() => void flow.zoomOut({ duration: 180 })}>
            <Minus />
          </Tool>
          <button
            className="zoom-value"
            aria-label="100% 크기로 보기"
            onClick={() => void flow.zoomTo(1, { duration: 200 })}
          >
            {zoom}%
          </button>
          <Tool label="확대" onClick={() => void flow.zoomIn({ duration: 180 })}>
            <Plus />
          </Tool>
          <span className="tool-divider" />
          <Tool
            label="전체 보기"
            onClick={() => void flow.fitView({ padding: 0.15, duration: 300 })}
          >
            <Focus />
          </Tool>
          <Tool label="미니맵" active={showMap} onClick={() => setShowMap(!showMap)}>
            <Map />
          </Tool>
        </Panel>
        <Panel position="bottom-left" className="canvas-hint">
          스크롤로 이동 · 핀치로 확대
        </Panel>
        {showMap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeColor={(node) =>
              node.data.status === 'understood'
                ? '#a9d677'
                : node.data.status === 'question'
                  ? '#e7bd79'
                  : '#c9d0c4'
            }
            maskColor="rgba(247,249,244,.75)"
          />
        )}
      </ReactFlow>
      {project.nodes.length === 0 && (
        <div className="canvas-empty">
          <Route size={30} />
          <h3>첫 번째 생각을 놓아봅니다.</h3>
          <Button onClick={() => onBranch()}>
            <Plus />
            개념 추가
          </Button>
        </div>
      )}
      <CanvasShortcuts onMode={setMode} />
    </div>
  )
}

function CanvasShortcuts({ onMode }: { onMode: (mode: 'select' | 'pan') => void }) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, [contenteditable="true"], [role="dialog"]')
      )
        return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() === 'v') onMode('select')
      if (event.key.toLowerCase() === 'h') onMode('pan')
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [onMode])
  return null
}

export function KnowledgeCanvas(props: Props) {
  return (
    <ReactFlowProvider key={props.project.id}>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

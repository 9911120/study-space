import { describe, expect, it } from 'vitest'
import { MarkerType } from '@xyflow/react'
import { graphSchema } from '../shared/schema'
import { createCanvasGraph } from '../src/lib/canvas-graph'

const node = (id: string, extra = {}) => ({
  id,
  title: id,
  summary: '개념을 설명합니다.',
  kind: 'concept',
  status: 'exploring',
  position: { x: 0, y: 0 },
  document: `${id}.md`,
  ...extra,
})
const graph = (nodes: unknown[], edges: unknown[] = []) => ({
  version: 1,
  id: 'example',
  title: '예시',
  description: '',
  nodes,
  edges,
})
const group = (id: string, extra = {}) =>
  node(id, { kind: 'group', size: { width: 900, height: 600 }, ...extra })

describe('캔버스 관계와 그룹', () => {
  it('중첩 그룹의 부모를 먼저 배치하며 자식의 상대 위치를 유지합니다.', () => {
    const input = graphSchema.parse(
      graph([
        node('child', { parentId: 'inner', position: { x: 40, y: 180 } }),
        group('inner', { parentId: 'outer', position: { x: 50, y: 150 } }),
        group('outer'),
      ]),
    )
    const { nodes } = createCanvasGraph(input, 'child', () => {})
    expect(nodes.map((item) => item.id)).toEqual(['outer', 'inner', 'child'])
    expect(nodes[2]).toMatchObject({
      parentId: 'inner',
      position: { x: 40, y: 180 },
      selected: true,
    })
    expect(nodes[0]).toMatchObject({ type: 'studyGroup', style: { width: 900, height: 600 } })
  })

  it('순서는 좌우 화살표로, 상하 관계는 위아래 선으로 연결합니다.', () => {
    const input = graphSchema.parse(
      graph(
        [node('a'), node('b'), node('c')],
        [
          { id: 'next', source: 'a', target: 'b', relation: 'sequence' },
          { id: 'detail', source: 'a', target: 'c', relation: 'hierarchy' },
        ],
      ),
    )
    const { edges } = createCanvasGraph(input, null, () => {})
    expect(edges[0]).toMatchObject({
      sourceHandle: 'sequence-out',
      targetHandle: 'sequence-in',
      markerEnd: { type: MarkerType.ArrowClosed },
    })
    expect(edges[1]).toMatchObject({ sourceHandle: 'hierarchy-out', targetHandle: 'hierarchy-in' })
    expect(edges[1].markerEnd).toBeUndefined()
  })

  it('없는 부모, 일반 노드를 부모로 지정하는 경우와 순환 그룹을 거부합니다.', () => {
    for (const nodes of [
      [node('child', { parentId: 'missing' })],
      [node('parent'), node('child', { parentId: 'parent' })],
      [group('self', { parentId: 'self' })],
      [group('a', { parentId: 'b' }), group('b', { parentId: 'a' })],
    ])
      expect(graphSchema.safeParse(graph(nodes)).success).toBe(false)
  })

  it('그룹 크기가 없거나 지원하지 않는 관계가 있으면 거부합니다.', () => {
    expect(graphSchema.safeParse(graph([node('group', { kind: 'group' })])).success).toBe(false)
    expect(
      graphSchema.safeParse(
        graph(
          [node('a'), node('b')],
          [{ id: 'link', source: 'a', target: 'b', relation: 'reference' }],
        ),
      ).success,
    ).toBe(false)
  })
})

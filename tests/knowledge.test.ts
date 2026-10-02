import { describe, expect, it } from 'vitest'
import { KnowledgeStore } from '../server/store'
import path from 'node:path'

describe('학습 지도', () => {
  it('실제 학습 자료의 모든 문서를 읽으며 순서와 상하 배치를 구분합니다.', async () => {
    const store = new KnowledgeStore(path.resolve('knowledge'))
    const list = await store.list()
    expect(list.errors).toEqual([])
    expect(list.projects.length).toBeGreaterThan(0)
    for (const summary of list.projects) {
      const project = await store.read(summary.id)
      const byId = new Map(project.nodes.map((item) => [item.id, item]))
      expect(project.nodes.filter((item) => item.kind === 'group').length).toBeGreaterThan(0)
      for (const item of project.nodes) {
        expect(project.documents[item.id]).toContain(`# ${item.title}`)
        expect(item.summary.length).toBeGreaterThan(60)
        if (item.parentId) {
          const parent = byId.get(item.parentId)!
          expect(parent.kind).toBe('group')
          if (parent.kind === 'group') {
            expect(item.position.x).toBeGreaterThanOrEqual(0)
            expect(item.position.x + 320).toBeLessThanOrEqual(parent.size.width)
            expect(item.position.y + 220).toBeLessThanOrEqual(parent.size.height)
          }
        }
      }
      for (const edge of project.edges) {
        const source = byId.get(edge.source)!
        const target = byId.get(edge.target)!
        expect(source.parentId).toBe(target.parentId)
        if (edge.relation === 'sequence') {
          expect(target.position.x).toBeGreaterThan(source.position.x + 320)
          expect(target.position.y).toBe(source.position.y)
        } else expect(target.position.y).toBeGreaterThan(source.position.y + 220)
      }
    }
  })
})

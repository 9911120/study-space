import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Graph } from '../shared/schema'

export async function writeProject(root: string, id = 'study') {
  const graph: Graph = {
    version: 1,
    id,
    title: '학습 주제',
    description: '',
    color: 'lime',
    nodes: [
      {
        id: 'start',
        title: '첫 개념',
        summary: '핵심 내용을 읽습니다.',
        kind: 'concept',
        status: 'exploring',
        position: { x: 0, y: 0 },
        document: 'start.md',
        tags: [],
      },
    ],
    edges: [],
  }
  await mkdir(path.join(root, id, 'documents'), { recursive: true })
  await writeFile(path.join(root, id, 'graph.json'), JSON.stringify(graph))
  await writeFile(path.join(root, id, 'documents/start.md'), '# 첫 개념\n\n학습 내용을 읽습니다.')
  return graph
}

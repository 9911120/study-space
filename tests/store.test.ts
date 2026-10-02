import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { KnowledgeStore } from '../server/store'
import { graphSchema } from '../shared/schema'
import { writeProject } from './fixture'

describe('읽기 전용 학습 저장소', () => {
  let root: string
  let store: KnowledgeStore
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'study-space-'))
    store = new KnowledgeStore(root)
    await store.init()
    await writeProject(root)
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })
  it('파일의 프로젝트와 Markdown을 읽고 원본을 유지합니다.', async () => {
    const before = await readFile(path.join(root, 'study/graph.json'), 'utf8')
    const project = await store.read('study')
    expect(project.documents.start).toContain('학습 내용을 읽습니다.')
    expect(await store.list()).toEqual({
      projects: [{ id: 'study', title: '학습 주제' }],
      errors: [],
    })
    expect(await readFile(path.join(root, 'study/graph.json'), 'utf8')).toBe(before)
  })
  it('외부 Markdown과 그래프 수정을 다시 읽습니다.', async () => {
    const first = await store.read('study')
    await writeFile(path.join(root, 'study/documents/start.md'), '# 외부 변경입니다.')
    const second = await store.read('study')
    expect(second.revision).not.toBe(first.revision)
    expect(second.documents.start).toBe('# 외부 변경입니다.')
    const { documents: _, revision: __, ...graph } = second
    await writeFile(
      path.join(root, 'study/graph.json'),
      JSON.stringify({ ...graph, title: '변경된 제목' }),
    )
    expect((await store.list()).projects[0].title).toBe('변경된 제목')
  })
  it('손상된 프로젝트를 다른 프로젝트와 분리해서 알립니다.', async () => {
    await writeProject(root, 'healthy')
    await writeFile(path.join(root, 'study/graph.json'), '{broken')
    const result = await store.list()
    expect(result.projects.map((project) => project.id)).toEqual(['healthy'])
    expect(result.errors).toHaveLength(1)
    await expect(store.read('study')).rejects.toMatchObject({ status: 422 })
    expect(await readFile(path.join(root, 'study/graph.json'), 'utf8')).toBe('{broken')
  })
  it('경로 이탈과 심볼릭 링크를 차단합니다.', async () => {
    await expect(store.read('../outside')).rejects.toMatchObject({ status: 400 })
    await rm(path.join(root, 'study/documents/start.md'))
    await symlink(path.join(root, 'study/graph.json'), path.join(root, 'study/documents/start.md'))
    await expect(store.read('study')).rejects.toMatchObject({ status: 422 })
  })
  it('문서 누락, 중복 ID, 없는 연결을 거부합니다.', async () => {
    const project = await store.read('study')
    expect(
      graphSchema.safeParse({ ...project, nodes: [...project.nodes, project.nodes[0]] }).success,
    ).toBe(false)
    expect(
      graphSchema.safeParse({
        ...project,
        edges: [{ id: 'invalid', source: 'start', target: 'missing' }],
      }).success,
    ).toBe(false)
    await rm(path.join(root, 'study/documents/start.md'))
    await expect(store.read('study')).rejects.toMatchObject({ status: 422 })
  })
})

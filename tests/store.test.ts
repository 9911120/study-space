import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { KnowledgeStore } from '../server/store'
import { createProjectSchema, createNodeSchema, graphSchema } from '../shared/schema'

describe('파일 기반 학습 저장소', () => {
  let root: string
  let store: KnowledgeStore
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'study-space-'))
    store = new KnowledgeStore(root)
    await store.init()
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })
  const create = () => store.create(createProjectSchema.parse({ title: '새로운 학습' }))

  it('프로젝트와 Markdown을 만들고 다시 읽습니다.', async () => {
    const project = await create()
    expect(project.title).toBe('새로운 학습')
    expect(await readFile(path.join(root, project.id, 'documents/start.md'), 'utf8')).toContain(
      '# 새로운 학습',
    )
    expect((await store.read(project.id)).revision).toBe(project.revision)
    expect((await store.list()).projects[0].nodeCount).toBe(1)
  })
  it('질문 가지, 연결, 좌표, 학습 상태를 파일에 저장합니다.', async () => {
    const project = await create()
    const branched = await store.addNode(
      project.id,
      createNodeSchema.parse({
        revision: project.revision,
        title: '왜 그럴까요?',
        kind: 'question',
        parentId: 'start',
      }),
    )
    expect(branched.edges[0].source).toBe('start')
    const question = branched.nodes[1]
    expect(question.status).toBe('question')
    const saved = await store.patch(project.id, {
      revision: branched.revision,
      positions: [{ id: question.id, position: { x: -100, y: 500 } }],
      statuses: [{ id: question.id, status: 'understood' }],
    })
    expect(saved.nodes[1].position).toEqual({ x: -100, y: 500 })
    expect((await store.list()).projects[0].understoodCount).toBe(1)
    const graph = JSON.parse(await readFile(path.join(root, project.id, 'graph.json'), 'utf8'))
    expect(graph).not.toHaveProperty('revision')
    expect(graph).not.toHaveProperty('documents')
  })
  it('외부 문서 수정과 오래된 저장 요청의 충돌을 감지합니다.', async () => {
    const project = await create()
    await writeFile(path.join(root, project.id, 'documents/start.md'), '# 외부 변경입니다.')
    expect((await store.read(project.id)).revision).not.toBe(project.revision)
    await expect(
      store.saveDocument(project.id, 'start', project.revision, '# 덮어쓰기'),
    ).rejects.toMatchObject({ status: 409 })
    expect((await store.read(project.id)).documents.start).toBe('# 외부 변경입니다.')
  })
  it('같은 revision의 동시 쓰기 중 하나만 허용합니다.', async () => {
    const project = await create()
    const results = await Promise.allSettled([
      store.saveDocument(project.id, 'start', project.revision, '# 첫 번째입니다.'),
      store.saveDocument(project.id, 'start', project.revision, '# 두 번째입니다.'),
    ])
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
  })
  it('잘못된 그래프를 목록 오류에 표시하고 원본을 보존합니다.', async () => {
    const project = await create()
    await writeFile(path.join(root, project.id, 'graph.json'), '{broken')
    expect((await store.list()).errors).toHaveLength(1)
    await expect(store.read(project.id)).rejects.toMatchObject({ status: 422 })
    expect(await readFile(path.join(root, project.id, 'graph.json'), 'utf8')).toBe('{broken')
  })
  it('경로 이탈과 심볼릭 링크를 차단합니다.', async () => {
    await expect(store.read('../outside')).rejects.toMatchObject({ status: 400 })
    const project = await create()
    const doc = path.join(root, project.id, 'documents/start.md')
    await rm(doc)
    await symlink(path.join(root, project.id, 'graph.json'), doc)
    await expect(store.read(project.id)).rejects.toMatchObject({ status: 422 })
    expect((await store.list()).errors).toHaveLength(1)
  })
  it('중복 ID, 없는 연결, 공유 문서 경로를 거부합니다.', async () => {
    const project = await create()
    expect(
      graphSchema.safeParse({ ...project, nodes: [...project.nodes, project.nodes[0]] }).success,
    ).toBe(false)
    await expect(
      store.patch(project.id, {
        revision: project.revision,
        edge: { source: 'start', target: 'missing' },
      }),
    ).rejects.toMatchObject({ status: 422 })
    expect((await store.read(project.id)).edges).toHaveLength(0)
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createApi } from '../server/api'
import { writeProject } from './fixture'
import { graphSchema } from '../shared/schema'

describe('읽기 전용 학습 API', () => {
  let root: string
  let api: Awaited<ReturnType<typeof createApi>>
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'study-api-'))
    await writeProject(root)
    api = await createApi(root, { watch: false })
  })
  afterEach(async () => {
    await api.close()
    await rm(root, { recursive: true, force: true })
  })
  it('프로젝트와 문서를 조회합니다.', async () => {
    const list = await request(api.app).get('/api/projects').expect(200)
    expect(list.body.projects).toEqual([{ id: 'study', title: '학습 주제' }])
    const project = await request(api.app).get('/api/projects/study').expect(200)
    expect(project.body.documents.start).toContain('학습 내용을 읽습니다.')
  })
  it('모든 쓰기 요청을 차단하고 파일을 보존합니다.', async () => {
    const before = await readFile(path.join(root, 'study/graph.json'), 'utf8')
    const create = await request(api.app)
      .post('/api/projects')
      .send({ title: '만들지 않습니다.' })
      .expect(405)
    expect(create.headers.allow).toBe('GET, HEAD')
    await request(api.app)
      .post('/api/projects/study/nodes')
      .send({ title: '추가하지 않습니다.' })
      .expect(405)
    await request(api.app).patch('/api/projects/study/graph').send({ positions: [] }).expect(405)
    await request(api.app)
      .put('/api/projects/study/documents/start')
      .send({ content: '수정하지 않습니다.' })
      .expect(405)
    await request(api.app).delete('/api/projects/study').expect(405)
    expect(await readFile(path.join(root, 'study/graph.json'), 'utf8')).toBe(before)
    expect(await readFile(path.join(root, 'study/documents/start.md'), 'utf8')).toContain(
      '학습 내용을 읽습니다.',
    )
  })
  it('잘못된 호스트, 출처, ID와 없는 경로를 처리합니다.', async () => {
    await request(api.app).get('/api/projects').set('Host', 'evil.example').expect(403)
    await request(api.app).get('/api/projects').set('Origin', 'https://evil.example').expect(403)
    await request(api.app).get('/api/projects/INVALID').expect(400)
    await request(api.app).get('/api/projects/missing').expect(404)
    await request(api.app).get('/api/missing').expect(404)
  })
  it('Swagger에는 조회 API만 노출합니다.', async () => {
    const spec = await request(api.app).get('/api/openapi.json').expect(200)
    expect(spec.body.openapi).toBe('3.1.0')
    for (const route of Object.values(spec.body.paths))
      expect(Object.keys(route as object)).toEqual(['get'])
    expect(spec.body.paths).not.toHaveProperty('/api/projects/{id}/graph')
    expect(spec.body.paths['/api/projects'].get.responses).toHaveProperty('405')
    expect(spec.body.components.schemas.Project.properties).toHaveProperty('revision')
    const example =
      spec.body.paths['/api/projects/{id}'].get.responses['200'].content['application/json'].example
    const parsed = graphSchema.parse(example)
    expect(parsed.nodes.some((node) => node.kind === 'group')).toBe(true)
    expect(new Set(parsed.edges.map((edge) => edge.relation))).toEqual(
      new Set(['sequence', 'hierarchy']),
    )
    for (const node of parsed.nodes) expect(example.documents[node.id]).toBeTypeOf('string')
    await request(api.app).get('/api/docs/').expect(200)
  })
  it('외부 파일 변경을 SSE로 알립니다.', async () => {
    await api.close()
    api = await createApi(root)
    const server = api.app.listen(0, '127.0.0.1')
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const address = server.address() as { port: number }
    const controller = new AbortController()
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/events`, {
        signal: controller.signal,
      })
      const reader = response.body!.getReader()
      expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: ready')
      await writeFile(path.join(root, 'study/documents/start.md'), '# 외부 파일 변경입니다.')
      expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: change')
      expect((await api.store.read('study')).documents.start).toContain('외부 파일 변경')
      await reader.cancel()
    } finally {
      controller.abort()
      await api.close()
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

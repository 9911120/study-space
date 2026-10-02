import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createApi } from '../server/api'

describe('학습 API', () => {
  let root: string
  let api: Awaited<ReturnType<typeof createApi>>
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'study-api-'))
    api = await createApi(root, { watch: false })
  })
  afterEach(async () => {
    await api.close()
    await rm(root, { recursive: true, force: true })
  })

  it('프로젝트 생성부터 질문, 문서 저장, 상태 변경까지 처리합니다.', async () => {
    const created = await request(api.app)
      .post('/api/projects')
      .send({ title: '테스트 주제' })
      .expect(201)
    const id = created.body.id
    const branch = await request(api.app)
      .post(`/api/projects/${id}/nodes`)
      .send({
        title: '새 질문',
        kind: 'question',
        parentId: 'start',
        revision: created.body.revision,
      })
      .expect(201)
    const node = branch.body.nodes[1]
    const saved = await request(api.app)
      .put(`/api/projects/${id}/documents/${node.id}`)
      .send({ revision: branch.body.revision, content: '# 이해했습니다.' })
      .expect(200)
    const updated = await request(api.app)
      .patch(`/api/projects/${id}/graph`)
      .send({ revision: saved.body.revision, statuses: [{ id: node.id, status: 'understood' }] })
      .expect(200)
    expect(updated.body.documents[node.id]).toBe('# 이해했습니다.')
    const list = await request(api.app).get('/api/projects').expect(200)
    expect(list.body.projects[0].understoodCount).toBe(1)
    await request(api.app)
      .put(`/api/projects/${id}/documents/${node.id}`)
      .send({ revision: branch.body.revision, content: '오래된 문서입니다.' })
      .expect(409)
  })
  it('다른 출처, 잘못된 호스트, 입력과 Content-Type을 거부합니다.', async () => {
    await request(api.app).get('/api/projects').set('Host', 'evil.example').expect(403)
    await request(api.app)
      .post('/api/projects')
      .set('Origin', 'https://evil.example')
      .send({ title: '제목' })
      .expect(403)
    await request(api.app).post('/api/projects').type('form').send({ title: '제목' }).expect(415)
    await request(api.app).post('/api/projects').send({ title: '' }).expect(400)
    await request(api.app).post('/api/projects').type('json').send('{').expect(400)
    await request(api.app).get('/api/projects/missing').expect(404)
    await request(api.app).get('/api/missing').expect(404)
  })
  it('Swagger 명세를 실제 경로와 스키마로 제공합니다.', async () => {
    const spec = await request(api.app).get('/api/openapi.json').expect(200)
    expect(spec.body.openapi).toBe('3.1.0')
    expect(spec.body.paths['/api/projects/{id}/documents/{nodeId}'].put.responses).toHaveProperty(
      '409',
    )
    expect(spec.body.components.schemas.Project.properties).toHaveProperty('revision')
    expect(spec.body.components.schemas.CreateNode.properties.kind.enum).toContain('question')
    expect(spec.body.components.schemas.CreateProject.required).toEqual(['title'])
    expect(spec.body.components.schemas.CreateNode.required).toEqual(['revision', 'title'])
    await request(api.app).get('/api/docs/').expect(200)
  })
  it('실제 파일 변경을 SSE로 알립니다.', async () => {
    await api.close()
    api = await createApi(root)
    const project = await api.store.create({ title: '변경 감시', description: '', color: 'lime' })
    const server = api.app.listen(0, '127.0.0.1')
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address() as { port: number }
    const controller = new AbortController()
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/events`, {
        signal: controller.signal,
      })
      const reader = response.body!.getReader()
      const first = await reader.read()
      expect(new TextDecoder().decode(first.value)).toContain('event: ready')
      await writeFile(path.join(root, project.id, 'documents/start.md'), '# 외부 파일 변경입니다.')
      const event = await reader.read()
      expect(new TextDecoder().decode(event.value)).toContain('event: change')
      expect((await api.store.read(project.id)).documents.start).toContain('외부 파일 변경')
      await reader.cancel()
    } finally {
      controller.abort()
      await api.close()
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

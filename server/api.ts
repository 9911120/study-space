import express, { type ErrorRequestHandler, type Response } from 'express'
import chokidar from 'chokidar'
import swaggerUi from 'swagger-ui-express'
import { ZodError } from 'zod'
import {
  createProjectSchema,
  createNodeSchema,
  patchGraphSchema,
  documentInputSchema,
} from '../shared/schema.ts'
import { KnowledgeStore, StoreError } from './store.ts'
import { openapi } from './openapi.ts'

export async function createApi(root: string, options: { watch?: boolean } = {}) {
  const store = new KnowledgeStore(root)
  await store.init()
  const app = express()
  const clients = new Set<Response>()
  app.disable('x-powered-by')
  app.use('/api', (req, res, next) => {
    const host = req.headers.host ?? ''
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))
      return res.status(403).json({ message: '로컬 환경에서만 접근할 수 있습니다.' })
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${host}` &&
      req.headers.origin !== `https://${host}`
    )
      return res.status(403).json({ message: '다른 출처의 요청은 허용되지 않습니다.' })
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.is('application/json'))
      return res.status(415).json({ message: 'application/json 형식으로 요청해야 합니다.' })
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.use(express.json({ limit: '1mb' }))
  app.get('/api/openapi.json', (_req, res) => res.json(openapi))
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, { customSiteTitle: 'Study Space API' }),
  )
  app.get('/api/projects', async (_req, res) => res.json(await store.list()))
  app.post('/api/projects', async (req, res) =>
    res.status(201).json(await store.create(createProjectSchema.parse(req.body))),
  )
  app.get('/api/projects/:id', async (req, res) => res.json(await store.read(req.params.id)))
  app.post('/api/projects/:id/nodes', async (req, res) =>
    res.status(201).json(await store.addNode(req.params.id, createNodeSchema.parse(req.body))),
  )
  app.patch('/api/projects/:id/graph', async (req, res) =>
    res.json(await store.patch(req.params.id, patchGraphSchema.parse(req.body))),
  )
  app.put('/api/projects/:id/documents/:nodeId', async (req, res) => {
    const input = documentInputSchema.parse(req.body)
    res.json(
      await store.saveDocument(req.params.id, req.params.nodeId, input.revision, input.content),
    )
  })
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('event: ready\ndata: {}\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
  })
  app.use('/api', (_req, res) => res.status(404).json({ message: 'API 경로를 찾을 수 없습니다.' }))
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError)
      return void res
        .status(400)
        .json({ message: '요청 데이터가 올바르지 않습니다.', issues: error.issues })
    if (error instanceof StoreError)
      return void res.status(error.status).json({ message: error.message })
    if (error.type === 'entity.parse.failed')
      return void res.status(400).json({ message: 'JSON 형식이 올바르지 않습니다.' })
    if (error.type === 'entity.too.large')
      return void res.status(413).json({ message: '요청 본문이 1MB를 초과합니다.' })
    console.error(error)
    res.status(500).json({
      message: '파일을 처리하지 못했습니다. 서버의 접근 권한과 파일 상태를 확인해 주십시오.',
    })
  }
  app.use(handleError)
  let timer: ReturnType<typeof setTimeout> | undefined
  const watcher =
    options.watch === false
      ? null
      : chokidar.watch(root, {
          ignoreInitial: true,
          followSymlinks: false,
          awaitWriteFinish: { stabilityThreshold: 180, pollInterval: 50 },
          ignored: (file) => file.endsWith('.tmp') || file.includes('/.creating-'),
        })
  watcher?.on('all', (_event, file) => {
    if (!file.endsWith('.json') && !file.endsWith('.md')) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      for (const client of clients) client.write('event: change\ndata: {}\n\n')
    }, 120)
  })
  watcher?.on('error', (error) => {
    console.error('학습 파일 감시 중 오류가 발생했습니다.', error)
    for (const client of clients) client.write('event: watch-error\ndata: {}\n\n')
  })
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(': heartbeat\n\n')
  }, 20000)
  heartbeat.unref()
  return {
    app,
    store,
    close: async () => {
      clearTimeout(timer)
      clearInterval(heartbeat)
      for (const client of clients) client.end()
      await watcher?.close()
    },
  }
}

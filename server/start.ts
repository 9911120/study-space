import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApi } from './api.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const api = await createApi(path.join(root, 'knowledge'))
api.app.use(express.static(path.join(root, 'dist')))
api.app.get('/{*path}', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
const port = Number(process.env.PORT ?? 4173)
const server = api.app.listen(port, '127.0.0.1', () =>
  console.log(`Study Space가 http://127.0.0.1:${port} 에서 실행됩니다.`),
)
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void api.close().then(() => server.close())
  })
}

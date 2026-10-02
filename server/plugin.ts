import type { Plugin } from 'vite'
import path from 'node:path'
import { createApi } from './api'

export function knowledgePlugin(): Plugin {
  return {
    name: 'study-space-knowledge',
    async configureServer(server) {
      const api = await createApi(path.resolve(server.config.root, 'knowledge'))
      server.middlewares.use(api.app)
      // 학습 파일은 SSE로 반영하므로 Vite의 전체 페이지 새로고침에서 제외합니다.
      server.watcher.unwatch(path.resolve(server.config.root, 'knowledge'))
      server.httpServer?.once('close', () => { void api.close() })
    },
  }
}

import { createHash } from 'node:crypto'
import { readFile, readdir, lstat, realpath } from 'node:fs/promises'
import path from 'node:path'
import { graphSchema, idSchema, type Project, type ProjectList } from '../shared/schema.ts'

export class StoreError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export class KnowledgeStore {
  constructor(readonly root: string) {}

  private async safePath(...parts: string[]) {
    const root = path.resolve(this.root)
    const rootInfo = await lstat(root)
    if (rootInfo.isSymbolicLink())
      throw new StoreError(422, 'knowledge 폴더에 심볼릭 링크를 사용할 수 없습니다.')
    let current = root
    for (const part of parts) {
      if (!part || part === '.' || part === '..' || /[/\\]/.test(part))
        throw new StoreError(400, '파일 경로가 올바르지 않습니다.')
      current = path.join(current, part)
      try {
        if ((await lstat(current)).isSymbolicLink())
          throw new StoreError(422, '학습 파일에 심볼릭 링크를 사용할 수 없습니다.')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }
    return current
  }

  async init() {
    await this.safePath()
    return realpath(this.root)
  }

  async read(id: string): Promise<Project> {
    if (!idSchema.safeParse(id).success)
      throw new StoreError(400, '프로젝트 ID가 올바르지 않습니다.')
    const file = await this.safePath(id, 'graph.json')
    let raw: string
    try {
      raw = await readFile(file, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new StoreError(404, '프로젝트를 찾을 수 없습니다.')
      throw error
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new StoreError(422, `${id}/graph.json의 JSON 형식이 올바르지 않습니다.`)
    }
    const result = graphSchema.safeParse(parsed)
    if (!result.success)
      throw new StoreError(
        422,
        `${id}/graph.json: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`,
      )
    if (result.data.id !== id)
      throw new StoreError(422, '프로젝트 ID와 폴더 이름이 일치하지 않습니다.')
    const documents: Record<string, string> = {}
    for (const node of result.data.nodes) {
      const doc = await this.safePath(id, 'documents', node.document)
      try {
        documents[node.id] = await readFile(doc, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT')
          throw new StoreError(422, `${id}/documents/${node.document} 파일이 없습니다.`)
        throw error
      }
    }
    const revision = createHash('sha256')
      .update(raw)
      .update(JSON.stringify(documents))
      .digest('hex')
    return { ...result.data, documents, revision }
  }

  async list(): Promise<ProjectList> {
    const entries = await readdir(this.root, { withFileTypes: true })
    const result: ProjectList = { projects: [], errors: [] }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (
        (!entry.isDirectory() && !entry.isSymbolicLink()) ||
        !idSchema.safeParse(entry.name).success
      )
        continue
      try {
        const graph = await this.read(entry.name)
        result.projects.push({ id: graph.id, title: graph.title })
      } catch (error) {
        result.errors.push({
          id: entry.name,
          message: error instanceof StoreError ? error.message : '프로젝트를 읽을 수 없습니다.',
        })
      }
    }
    return result
  }
}

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, rename, readdir, lstat, realpath, rm } from 'node:fs/promises'
import path from 'node:path'
import { graphSchema, idSchema, type Graph, type Project, type ProjectList, type ProjectInput, type NodeInput, type GraphPatch } from '../shared/schema'

export class StoreError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export class KnowledgeStore {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(readonly root: string) {}

  private async safePath(...parts: string[]) {
    const root = path.resolve(this.root)
    const rootInfo = await lstat(root)
    if (rootInfo.isSymbolicLink()) throw new StoreError(422, 'knowledge 폴더에 심볼릭 링크를 사용할 수 없습니다.')
    let current = root
    for (const part of parts) {
      if (!part || part === '.' || part === '..' || /[/\\]/.test(part)) throw new StoreError(400, '파일 경로가 올바르지 않습니다.')
      current = path.join(current, part)
      try {
        if ((await lstat(current)).isSymbolicLink()) throw new StoreError(422, '학습 파일에 심볼릭 링크를 사용할 수 없습니다.')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }
    return current
  }

  private async atomicWrite(file: string, content: string) {
    const temp = `${file}.${randomUUID()}.tmp`
    try {
      await writeFile(temp, content, { flag: 'wx' })
      await rename(temp, file)
    } finally { await rm(temp, { force: true }) }
  }

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work)
    this.queue = next.catch(() => {})
    return next
  }

  async init() {
    await mkdir(this.root, { recursive: true })
    await this.safePath()
    return realpath(this.root)
  }

  async read(id: string): Promise<Project> {
    if (!idSchema.safeParse(id).success) throw new StoreError(400, '프로젝트 ID가 올바르지 않습니다.')
    const file = await this.safePath(id, 'graph.json')
    let raw: string
    try { raw = await readFile(file, 'utf8') }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new StoreError(404, '프로젝트를 찾을 수 없습니다.')
      throw error
    }
    let parsed: unknown
    try { parsed = JSON.parse(raw) }
    catch { throw new StoreError(422, `${id}/graph.json의 JSON 형식이 올바르지 않습니다.`) }
    const result = graphSchema.safeParse(parsed)
    if (!result.success) throw new StoreError(422, `${id}/graph.json: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
    if (result.data.id !== id) throw new StoreError(422, '프로젝트 ID와 폴더 이름이 일치하지 않습니다.')
    const documents: Record<string, string> = {}
    for (const node of result.data.nodes) {
      const doc = await this.safePath(id, 'documents', node.document)
      try { documents[node.id] = await readFile(doc, 'utf8') }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new StoreError(422, `${id}/documents/${node.document} 파일이 없습니다.`)
        throw error
      }
    }
    const revision = createHash('sha256').update(raw).update(JSON.stringify(documents)).digest('hex')
    return { ...result.data, documents, revision }
  }

  async list(): Promise<ProjectList> {
    const entries = await readdir(this.root, { withFileTypes: true })
    const result: ProjectList = { projects: [], errors: [] }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if ((!entry.isDirectory() && !entry.isSymbolicLink()) || !idSchema.safeParse(entry.name).success) continue
      try {
        const graph = await this.read(entry.name)
        result.projects.push({ id: graph.id, title: graph.title, description: graph.description, color: graph.color, nodeCount: graph.nodes.length, understoodCount: graph.nodes.filter((node) => node.status === 'understood').length, questionCount: graph.nodes.filter((node) => node.status === 'question').length })
      } catch (error) {
        result.errors.push({ id: entry.name, message: error instanceof StoreError ? error.message : '프로젝트를 읽을 수 없습니다.' })
      }
    }
    return result
  }

  private async current(id: string, revision: string) {
    const project = await this.read(id)
    if (project.revision !== revision) throw new StoreError(409, '다른 곳에서 파일이 변경되었습니다. 최신 내용을 확인한 뒤 다시 저장해 주십시오.')
    return project
  }

  private async saveGraph(project: Project | Graph) {
    const graph = graphSchema.parse(project)
    await this.atomicWrite(await this.safePath(graph.id, 'graph.json'), `${JSON.stringify(graph, null, 2)}\n`)
    return this.read(graph.id)
  }

  async create(input: ProjectInput) {
    return this.exclusive(async () => {
      const prefix = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'study'
      const id = `${prefix}-${randomUUID().slice(0, 8)}`
      const stageName = `.creating-${randomUUID()}`
      const stage = await this.safePath(stageName)
      const graph: Graph = { version: 1, id, ...input, nodes: [{ id: 'start', title: input.title, summary: input.description || '이 주제에서 첫 번째 질문을 시작합니다.', kind: 'concept', status: 'exploring', position: { x: 0, y: 0 }, document: 'start.md', tags: [] }], edges: [] }
      try {
        await mkdir(path.join(stage, 'documents'), { recursive: true })
        await writeFile(path.join(stage, 'documents', 'start.md'), `# ${input.title}\n\n${input.description}\n\n## 공부할 질문\n\n- 가장 먼저 이해하고 싶은 내용을 기록합니다.\n`)
        await writeFile(path.join(stage, 'graph.json'), `${JSON.stringify(graph, null, 2)}\n`)
        await rename(stage, await this.safePath(id))
      } finally { await rm(stage, { recursive: true, force: true }) }
      return this.read(id)
    })
  }

  async addNode(id: string, input: NodeInput) {
    return this.exclusive(async () => {
      const project = await this.current(id, input.revision)
      const parent = input.parentId ? project.nodes.find((node) => node.id === input.parentId) : undefined
      if (input.parentId && !parent) throw new StoreError(404, '상위 개념을 찾을 수 없습니다.')
      if (project.nodes.length >= 1000) throw new StoreError(422, '프로젝트당 개념은 최대 1,000개까지 추가할 수 있습니다.')
      const nodeId = `node-${randomUUID().slice(0, 8)}`
      const siblings = project.edges.filter((edge) => edge.source === parent?.id).length
      const node = { id: nodeId, title: input.title, summary: input.summary, kind: input.kind, status: input.kind === 'question' ? 'question' as const : 'exploring' as const, position: parent ? { x: parent.position.x + 380, y: parent.position.y + siblings * 220 } : { x: 0, y: project.nodes.length * 220 }, document: `${nodeId}.md`, tags: [] }
      project.nodes.push(node)
      if (parent) project.edges.push({ id: `edge-${randomUUID().slice(0, 8)}`, source: parent.id, target: nodeId })
      graphSchema.parse(project)
      const docFile = await this.safePath(id, 'documents', node.document)
      await writeFile(docFile, input.content || `# ${input.title}\n\n${input.summary}\n`, { flag: 'wx' })
      try { return await this.saveGraph(project) }
      catch (error) { await rm(docFile, { force: true }); throw error }
    })
  }

  async patch(id: string, input: GraphPatch) {
    return this.exclusive(async () => {
      const project = await this.current(id, input.revision)
      for (const update of [...(input.positions ?? []), ...(input.statuses ?? [])]) {
        const node = project.nodes.find((item) => item.id === update.id)
        if (!node) throw new StoreError(404, '개념을 찾을 수 없습니다.')
        if ('position' in update) node.position = update.position
        if ('status' in update) node.status = update.status
      }
      if (input.edge) {
        if (project.edges.some((edge) => edge.source === input.edge!.source && edge.target === input.edge!.target)) throw new StoreError(422, '이미 연결된 개념입니다.')
        project.edges.push({ ...input.edge, id: `edge-${randomUUID().slice(0, 8)}` })
      }
      const validation = graphSchema.safeParse(project)
      if (!validation.success) throw new StoreError(422, '연결이나 위치 데이터가 올바르지 않습니다.')
      return this.saveGraph(project)
    })
  }

  async saveDocument(id: string, nodeId: string, revision: string, content: string) {
    return this.exclusive(async () => {
      const project = await this.current(id, revision)
      const node = project.nodes.find((item) => item.id === nodeId)
      if (!node) throw new StoreError(404, '개념을 찾을 수 없습니다.')
      await this.atomicWrite(await this.safePath(id, 'documents', node.document), content)
      return this.read(id)
    })
  }
}

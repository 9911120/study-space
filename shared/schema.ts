import { z } from 'zod'

export const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100)
export const statusSchema = z.enum(['exploring', 'understood', 'question'])
export const kindSchema = z.enum(['concept', 'question', 'note', 'group'])
export const relationSchema = z.enum(['sequence', 'hierarchy'])
export const positionSchema = z.object({
  x: z.number().finite().min(-100000).max(100000),
  y: z.number().finite().min(-100000).max(100000),
})
const nodeBase = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(120),
  summary: z.string().max(400),
  status: statusSchema,
  position: positionSchema,
  parentId: idSchema
    .optional()
    .describe('이 노드를 포함하는 그룹 ID입니다. position은 그룹 안의 상대 좌표입니다.'),
  document: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/),
  tags: z.array(z.string().max(40)).max(10).default([]),
})
export const nodeSchema = z.discriminatedUnion('kind', [
  nodeBase.extend({ kind: z.enum(['concept', 'question', 'note']) }),
  nodeBase.extend({
    kind: z.literal('group'),
    size: z
      .object({
        width: z.number().finite().min(400).max(20000),
        height: z.number().finite().min(200).max(20000),
      })
      .describe('자식과 제목을 담는 그룹 영역의 픽셀 크기입니다.'),
  }),
])
export const edgeSchema = z.object({
  id: idSchema,
  source: idSchema,
  target: idSchema,
  relation: relationSchema
    .default('hierarchy')
    .describe(
      'sequence는 좌우 순서 화살표, hierarchy는 위아래 상하 연결입니다. 기존 파일에서 생략하면 hierarchy로 읽습니다.',
    ),
  label: z.string().max(80).optional(),
})
export const graphSchema = z
  .object({
    version: z.literal(1),
    id: idSchema,
    title: z.string().trim().min(1).max(120),
    description: z.string().max(400),
    color: z.enum(['lime', 'blue', 'amber', 'rose']).default('lime'),
    nodes: z.array(nodeSchema).max(1000),
    edges: z.array(edgeSchema).max(4000),
  })
  .superRefine((graph, ctx) => {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
    const ids = new Set(graph.nodes.map((node) => node.id))
    if (ids.size !== graph.nodes.length)
      ctx.addIssue({ code: 'custom', message: '개념 ID가 중복됩니다.', path: ['nodes'] })
    if (new Set(graph.nodes.map((node) => node.document)).size !== graph.nodes.length)
      ctx.addIssue({
        code: 'custom',
        message: '문서 파일은 개념마다 달라야 합니다.',
        path: ['nodes'],
      })
    if (new Set(graph.edges.map((edge) => edge.id)).size !== graph.edges.length)
      ctx.addIssue({ code: 'custom', message: '연결 ID가 중복됩니다.', path: ['edges'] })
    for (const [index, node] of graph.nodes.entries()) {
      if (!node.parentId) continue
      const parent = nodeById.get(node.parentId)
      if (!parent || parent.kind !== 'group') {
        ctx.addIssue({
          code: 'custom',
          message: '부모는 존재하는 그룹이어야 합니다.',
          path: ['nodes', index, 'parentId'],
        })
        continue
      }
      const visited = new Set([node.id])
      let ancestor: typeof node | undefined = parent
      while (ancestor) {
        if (visited.has(ancestor.id)) {
          ctx.addIssue({
            code: 'custom',
            message: '그룹을 순환해서 포함할 수 없습니다.',
            path: ['nodes', index, 'parentId'],
          })
          break
        }
        visited.add(ancestor.id)
        ancestor = ancestor.parentId ? nodeById.get(ancestor.parentId) : undefined
      }
    }
    const pairs = new Set<string>()
    for (const [index, edge] of graph.edges.entries()) {
      const pair = `${edge.source}:${edge.target}`
      if (
        !ids.has(edge.source) ||
        !ids.has(edge.target) ||
        edge.source === edge.target ||
        pairs.has(pair)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: '연결 대상이 없거나 연결이 중복됩니다.',
          path: ['edges', index],
        })
      }
      pairs.add(pair)
    }
  })

export type KnowledgeNode = z.infer<typeof nodeSchema>
export type KnowledgeEdge = z.infer<typeof edgeSchema>
export type Graph = z.infer<typeof graphSchema>
export type NodeStatus = KnowledgeNode['status']
export type NodeKind = KnowledgeNode['kind']
export type Project = Graph & { revision: string; documents: Record<string, string> }
export type ProjectSummary = Pick<Graph, 'id' | 'title'>
export type ProjectList = { projects: ProjectSummary[]; errors: { id: string; message: string }[] }

import { z } from 'zod'

export const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)
export const statusSchema = z.enum(['exploring', 'understood', 'question'])
export const kindSchema = z.enum(['concept', 'question', 'note'])
export const positionSchema = z.object({ x: z.number().finite().min(-100000).max(100000), y: z.number().finite().min(-100000).max(100000) })
export const nodeSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(120),
  summary: z.string().max(400),
  kind: kindSchema,
  status: statusSchema,
  position: positionSchema,
  document: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/),
  tags: z.array(z.string().max(40)).max(10).default([]),
})
export const edgeSchema = z.object({ id: idSchema, source: idSchema, target: idSchema, label: z.string().max(80).optional() })
export const graphSchema = z.object({
  version: z.literal(1), id: idSchema,
  title: z.string().trim().min(1).max(120), description: z.string().max(400),
  color: z.enum(['lime', 'blue', 'amber', 'rose']).default('lime'),
  nodes: z.array(nodeSchema).max(1000), edges: z.array(edgeSchema).max(4000),
}).superRefine((graph, ctx) => {
  const ids = new Set(graph.nodes.map((node) => node.id))
  if (ids.size !== graph.nodes.length) ctx.addIssue({ code: 'custom', message: '개념 ID가 중복됩니다.', path: ['nodes'] })
  if (new Set(graph.nodes.map((node) => node.document)).size !== graph.nodes.length) ctx.addIssue({ code: 'custom', message: '문서 파일은 개념마다 달라야 합니다.', path: ['nodes'] })
  if (new Set(graph.edges.map((edge) => edge.id)).size !== graph.edges.length) ctx.addIssue({ code: 'custom', message: '연결 ID가 중복됩니다.', path: ['edges'] })
  const pairs = new Set<string>()
  for (const [index, edge] of graph.edges.entries()) {
    const pair = `${edge.source}:${edge.target}`
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target || pairs.has(pair)) {
      ctx.addIssue({ code: 'custom', message: '연결 대상이 없거나 연결이 중복됩니다.', path: ['edges', index] })
    }
    pairs.add(pair)
  }
})

export const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const createProjectSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().max(400).default(''), color: z.enum(['lime', 'blue', 'amber', 'rose']).default('lime') }).strict()
export const createNodeSchema = z.object({
  revision: revisionSchema, title: z.string().trim().min(1).max(120),
  summary: z.string().max(400).default(''), kind: kindSchema.default('concept'),
  parentId: idSchema.optional(), content: z.string().max(200000).default(''),
}).strict()
export const patchGraphSchema = z.object({
  revision: revisionSchema,
  positions: z.array(z.object({ id: idSchema, position: positionSchema }).strict()).max(1000).optional(),
  statuses: z.array(z.object({ id: idSchema, status: statusSchema }).strict()).max(1000).optional(),
  edge: z.object({ source: idSchema, target: idSchema }).strict().optional(),
}).strict()
export const documentInputSchema = z.object({ revision: revisionSchema, content: z.string().max(200000) }).strict()

export type KnowledgeNode = z.infer<typeof nodeSchema>
export type KnowledgeEdge = z.infer<typeof edgeSchema>
export type Graph = z.infer<typeof graphSchema>
export type NodeStatus = KnowledgeNode['status']
export type NodeKind = KnowledgeNode['kind']
export type Project = Graph & { revision: string; documents: Record<string, string> }
export type ProjectSummary = Pick<Graph, 'id' | 'title' | 'description' | 'color'> & { nodeCount: number; understoodCount: number; questionCount: number }
export type ProjectList = { projects: ProjectSummary[]; errors: { id: string; message: string }[] }
export type GraphPatch = z.infer<typeof patchGraphSchema>
export type NodeInput = z.infer<typeof createNodeSchema>
export type ProjectInput = z.infer<typeof createProjectSchema>

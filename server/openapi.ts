import { z } from 'zod'
import { graphSchema, nodeSchema, edgeSchema, createProjectSchema, createNodeSchema, patchGraphSchema, documentInputSchema } from '../shared/schema'

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema: unknown) => ({ 'application/json': { schema } })
const errorResponse = (description: string) => ({ description, content: json(ref('Error')) })
const commonErrors = { '400': errorResponse('ID, JSON 또는 요청 스키마가 올바르지 않습니다.'), '403': errorResponse('로컬 호스트 또는 동일 출처 요청이 아닙니다.'), '500': errorResponse('파일 접근 또는 내부 처리에 실패했습니다.') }
const fileErrors = { '404': errorResponse('프로젝트 또는 개념이 없습니다.'), '422': errorResponse('학습 파일, 문서 또는 연결 데이터가 올바르지 않습니다.') }
const writeErrors = { ...commonErrors, ...fileErrors, '409': errorResponse('revision이 최신 상태와 다릅니다. 다시 읽고 변경을 검토해야 합니다.'), '413': errorResponse('요청 본문이 1MB를 초과합니다.'), '415': errorResponse('Content-Type은 application/json이어야 합니다.') }
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 100 }, example: 'llm' }
const requestBody = (name: string, example: unknown) => ({ required: true, content: { 'application/json': { schema: ref(name), example } } })
const revision = 'a'.repeat(64)
const projectExample = { version: 1, id: 'llm', title: 'LLM, 기초부터 이해하기', description: '언어 모델의 핵심 개념을 연결합니다.', color: 'lime', nodes: [{ id: 'start', title: '언어 모델', summary: '다음 토큰의 확률을 예측합니다.', kind: 'concept', status: 'exploring', position: { x: 0, y: 0 }, document: 'start.md', tags: ['기초'] }], edges: [], documents: { start: '# 언어 모델\n\n다음 토큰의 확률을 예측합니다.' }, revision }
const projectResponse = (description: string) => ({ description, content: { 'application/json': { schema: ref('Project'), example: projectExample } } })
const schemaOf = (schema: z.ZodType) => {
  const { $schema: _, ...rest } = z.toJSONSchema(schema)
  return rest
}

export const openapi = {
  openapi: '3.1.0',
  info: { title: 'Study Space API', version: '1.0.0', description: '로컬 knowledge 폴더의 JSON 및 Markdown 파일을 읽고 저장합니다. 쓰기 요청은 최신 프로젝트의 revision이 필요합니다. 인증이 없는 로컬 전용 API이므로 서버는 루프백 주소에서만 실행합니다.' },
  servers: [{ url: '/' }],
  paths: {
    '/api/projects': {
      get: { summary: '학습 프로젝트 목록을 조회합니다.', operationId: 'listProjects', responses: { '200': { description: '읽을 수 없는 프로젝트는 errors에 표시합니다.', content: json(ref('ProjectList')) }, ...commonErrors } },
      post: { summary: '첫 개념과 함께 학습 프로젝트를 생성합니다.', operationId: 'createProject', requestBody: requestBody('CreateProject', { title: 'LLM 공부', description: '토큰부터 차근차근 공부합니다.', color: 'lime' }), responses: { '201': projectResponse('프로젝트 폴더, graph.json, documents/start.md를 생성했습니다.'), ...writeErrors } },
    },
    '/api/projects/{id}': { get: { summary: '개념, 연결, Markdown 문서와 revision을 조회합니다.', operationId: 'getProject', parameters: [idParam], responses: { '200': projectResponse('프로젝트를 읽었습니다.'), ...commonErrors, ...fileErrors } } },
    '/api/projects/{id}/nodes': { post: { summary: '개념 또는 질문을 추가하고 선택한 상위 개념에 연결합니다.', operationId: 'addNode', parameters: [idParam], requestBody: requestBody('CreateNode', { revision, title: '토큰은 무엇인가요?', kind: 'question', parentId: 'start', summary: '문장을 모델의 입력으로 바꾸는 방법을 알아봅니다.', content: '# 토큰\n\n공부할 내용을 작성합니다.' }), responses: { '201': projectResponse('새 Markdown 문서와 개념을 생성했습니다.'), ...writeErrors } } },
    '/api/projects/{id}/graph': { patch: { summary: '개념 위치, 학습 상태 또는 연결을 저장합니다.', operationId: 'patchGraph', parameters: [idParam], requestBody: requestBody('PatchGraph', { revision, positions: [{ id: 'start', position: { x: 100, y: 200 } }], statuses: [{ id: 'start', status: 'understood' }] }), responses: { '200': projectResponse('graph.json을 저장했습니다.'), ...writeErrors } } },
    '/api/projects/{id}/documents/{nodeId}': { put: { summary: '개념의 Markdown 문서를 저장합니다.', operationId: 'saveDocument', parameters: [idParam, { name: 'nodeId', in: 'path', required: true, schema: { type: 'string' }, example: 'start' }], requestBody: requestBody('SaveDocument', { revision, content: '# 오늘 이해한 내용\n\n문서 내용을 기록합니다.' }), responses: { '200': projectResponse('Markdown 파일을 저장했습니다.'), ...writeErrors } } },
    '/api/events': { get: { summary: '파일 변경 알림을 구독합니다.', operationId: 'watchKnowledge', responses: { '200': { description: 'ready는 연결 완료, change는 재조회가 필요한 파일 변경, watch-error는 감시 오류입니다. 20초마다 heartbeat 주석을 전송합니다.', content: { 'text/event-stream': { schema: { type: 'string' }, example: 'event: ready\ndata: {}\n\nevent: change\ndata: {}\n\n' } } }, ...commonErrors } } },
    '/api/openapi.json': { get: { summary: 'OpenAPI 3.1 문서를 조회합니다.', responses: { '200': { description: 'OpenAPI 명세입니다.', content: json({ type: 'object' }) }, ...commonErrors } } },
    '/api/docs': { get: { summary: 'Swagger UI를 표시합니다.', responses: { '200': { description: 'API 탐색 및 실행 화면입니다.', content: { 'text/html': { schema: { type: 'string' } } } }, ...commonErrors } } },
  },
  components: { schemas: {
    Graph: schemaOf(graphSchema), Node: schemaOf(nodeSchema), Edge: schemaOf(edgeSchema),
    Project: { ...schemaOf(graphSchema), additionalProperties: false, properties: { ...schemaOf(graphSchema).properties, revision: { type: 'string', pattern: '^[a-f0-9]{64}$' }, documents: { type: 'object', additionalProperties: { type: 'string' }, description: '개념 ID별 Markdown 원문입니다.' } }, required: [...(schemaOf(graphSchema).required ?? []), 'revision', 'documents'] },
    ProjectList: { type: 'object', required: ['projects', 'errors'], properties: { projects: { type: 'array', items: { type: 'object', required: ['id', 'title', 'description', 'color', 'nodeCount', 'understoodCount', 'questionCount'], properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, color: { type: 'string', enum: ['lime', 'blue', 'amber', 'rose'] }, nodeCount: { type: 'integer' }, understoodCount: { type: 'integer' }, questionCount: { type: 'integer' } } } }, errors: { type: 'array', items: { type: 'object', required: ['id', 'message'], properties: { id: { type: 'string' }, message: { type: 'string' } } } } } },
    CreateProject: schemaOf(createProjectSchema), CreateNode: schemaOf(createNodeSchema), PatchGraph: schemaOf(patchGraphSchema), SaveDocument: schemaOf(documentInputSchema),
    Error: { type: 'object', required: ['message'], properties: { message: { type: 'string' }, issues: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
  } },
}

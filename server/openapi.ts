import { z } from 'zod'
import { graphSchema } from '../shared/schema.ts'

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema: unknown) => ({ 'application/json': { schema } })
const error = (description: string) => ({ description, content: json(ref('Error')) })
const errors = {
  '400': error('프로젝트 ID가 올바르지 않습니다.'),
  '403': error('로컬 호스트 또는 동일 출처 요청이 아닙니다.'),
  '405': {
    ...error('읽기 전용 API입니다. GET과 HEAD만 지원합니다.'),
    headers: { Allow: { schema: { type: 'string', const: 'GET, HEAD' } } },
  },
  '500': error('파일 접근 또는 내부 처리에 실패했습니다.'),
}
const { $schema: _, ...graph } = z.toJSONSchema(graphSchema)
const projectExample = {
  version: 1,
  id: 'llm',
  title: 'LLM은 어떻게 작동하나요?',
  description: '입력에서 출력까지의 흐름을 공부합니다.',
  color: 'lime',
  nodes: [
    {
      id: 'process',
      title: '입력 처리 과정',
      summary: '문장을 숫자로 바꾸는 두 단계를 묶습니다.',
      kind: 'group',
      status: 'exploring',
      position: { x: 0, y: 0 },
      size: { width: 860, height: 800 },
      document: 'process.md',
      tags: [],
    },
    {
      id: 'start',
      title: '토큰화',
      summary: '텍스트 조각을 정수 ID로 바꿉니다.',
      kind: 'concept',
      status: 'exploring',
      position: { x: 40, y: 180 },
      parentId: 'process',
      document: 'start.md',
      tags: [],
    },
    {
      id: 'embedding',
      title: '임베딩',
      summary: '토큰 ID를 벡터로 바꿉니다.',
      kind: 'concept',
      status: 'exploring',
      position: { x: 460, y: 180 },
      parentId: 'process',
      document: 'embedding.md',
      tags: [],
    },
    {
      id: 'vocabulary',
      title: '어휘 표',
      summary: '토큰과 ID의 대응을 담습니다.',
      kind: 'concept',
      status: 'exploring',
      position: { x: 40, y: 490 },
      parentId: 'process',
      document: 'vocabulary.md',
      tags: [],
    },
  ],
  edges: [
    { id: 'tokens-to-vectors', source: 'start', target: 'embedding', relation: 'sequence' },
    { id: 'tokens-vocabulary', source: 'start', target: 'vocabulary', relation: 'hierarchy' },
  ],
  documents: {
    process: '# 입력 처리 과정\n\n문장을 숫자로 바꿉니다.',
    start: '# 토큰화\n\n텍스트 조각을 정수 ID로 바꿉니다.',
    embedding: '# 임베딩\n\n토큰 ID를 벡터로 바꿉니다.',
    vocabulary: '# 어휘 표\n\n토큰과 ID의 대응을 담습니다.',
  },
  revision: 'a'.repeat(64),
}

export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Study Space API',
    version: '2.1.0',
    description:
      'knowledge 폴더의 학습 지도를 읽는 로컬 전용 API입니다. 생성·수정·삭제 API는 제공하지 않습니다. GET과 HEAD 이외의 요청에는 405와 Allow: GET, HEAD를 반환합니다. 파일은 Codex에서 직접 작성하며 변경 사항을 SSE로 알립니다.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/projects': {
      get: {
        summary: '학습 프로젝트 목록을 조회합니다.',
        operationId: 'listProjects',
        responses: {
          '200': {
            description: '읽을 수 없는 프로젝트는 errors에 표시합니다.',
            content: {
              'application/json': {
                schema: ref('ProjectList'),
                example: {
                  projects: [{ id: 'llm', title: 'LLM은 어떻게 작동하나요?' }],
                  errors: [],
                },
              },
            },
          },
          ...errors,
        },
      },
    },
    '/api/projects/{id}': {
      get: {
        summary: '학습 지도와 Markdown 문서를 읽습니다.',
        operationId: 'getProject',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 100 },
            example: 'llm',
          },
        ],
        responses: {
          '200': {
            description:
              'revision은 파일 변경을 감지하기 위한 해시입니다. relation은 sequence(좌우 순서) 또는 hierarchy(위아래 상하)입니다. kind가 group인 노드는 size로 영역을 정하며, parentId는 자식의 소속 그룹을 나타냅니다. 자식 position은 그룹 기준 상대 좌표입니다.',
            content: { 'application/json': { schema: ref('Project'), example: projectExample } },
          },
          ...errors,
          '404': error('프로젝트가 없습니다.'),
          '422': error(
            '학습 파일, 문서 경로, 연결 또는 그룹 구조가 올바르지 않습니다. 없는 부모, 그룹이 아닌 부모와 순환 포함을 허용하지 않습니다.',
          ),
        },
      },
    },
    '/api/events': {
      get: {
        summary: '파일 변경 알림을 구독합니다.',
        operationId: 'watchKnowledge',
        responses: {
          '200': {
            description:
              'ready는 연결 완료, change는 파일 변경, watch-error는 파일 감시 오류입니다. 20초마다 heartbeat 주석을 전송합니다.',
            content: {
              'text/event-stream': {
                schema: { type: 'string' },
                example: 'event: ready\ndata: {}\n\nevent: change\ndata: {}\n\n',
              },
            },
          },
          ...errors,
        },
      },
    },
    '/api/openapi.json': {
      get: {
        summary: 'OpenAPI 문서를 조회합니다.',
        responses: {
          '200': { description: 'OpenAPI 3.1 명세입니다.', content: json({ type: 'object' }) },
          ...errors,
        },
      },
    },
    '/api/docs': {
      get: {
        summary: 'Swagger UI를 표시합니다.',
        responses: {
          '200': {
            description: '조회 API 문서입니다.',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          ...errors,
        },
      },
    },
  },
  components: {
    schemas: {
      Project: {
        ...graph,
        properties: {
          ...graph.properties,
          revision: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          documents: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: '개념 ID별 Markdown 원문입니다.',
          },
        },
        required: [...(graph.required ?? []), 'revision', 'documents'],
      },
      ProjectList: {
        type: 'object',
        required: ['projects', 'errors'],
        properties: {
          projects: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title'],
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'message'],
              properties: { id: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      Error: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } },
    },
  },
}

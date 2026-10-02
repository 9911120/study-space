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
  title: 'LLM, 기초부터 이해하기',
  description: '언어 모델을 공부합니다.',
  color: 'lime',
  nodes: [
    {
      id: 'start',
      title: '언어 모델',
      summary: '다음 토큰의 확률을 예측합니다.',
      kind: 'concept',
      status: 'exploring',
      position: { x: 0, y: 0 },
      document: 'start.md',
      tags: [],
    },
  ],
  edges: [],
  documents: { start: '# 언어 모델\n\n다음 토큰의 확률을 예측합니다.' },
  revision: 'a'.repeat(64),
}

export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Study Space API',
    version: '2.0.0',
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
                example: { projects: [{ id: 'llm', title: 'LLM, 기초부터 이해하기' }], errors: [] },
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
            description: 'revision은 파일 변경을 감지하기 위한 해시입니다.',
            content: { 'application/json': { schema: ref('Project'), example: projectExample } },
          },
          ...errors,
          '404': error('프로젝트가 없습니다.'),
          '422': error('학습 파일, 문서 경로 또는 연결 데이터가 올바르지 않습니다.'),
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

# Study Space

개념을 연결하면서 공부하는 로컬 학습 캔버스입니다. React, Vite, TypeScript, Tailwind CSS, shadcn/ui의 공식 `sidebar-07` 블록과 React Flow를 사용합니다.

## 실행

Node.js 22.12 이상을 사용합니다. 개발 및 빌드 결과 실행은 사용자가 직접 진행합니다.

```bash
npm install
npm run dev
```

터미널에 표시된 로컬 주소로 접속합니다. 기본 주소는 `http://127.0.0.1:5173`입니다. 첫 화면에는 LLM 기초 예제 지도가 표시됩니다.

빌드 결과를 사용할 때는 다음 명령을 실행합니다.

```bash
npm run build
npm start
```

기본 주소는 `http://127.0.0.1:4173`입니다. `PORT` 환경 변수로 변경할 수 있습니다. 파일 API가 필요하므로 `dist`만 정적 호스팅하거나 `vite preview`만 실행하는 방식은 지원하지 않습니다. 인증이 없는 개인용 도구이며 서버는 루프백 주소에만 바인딩합니다.

## 학습 흐름

1. **새 학습 시작**에서 주제를 입력해 프로젝트를 생성합니다.
2. 개념 카드를 선택해 오른쪽에서 Markdown 문서를 읽거나 편집합니다.
3. 카드의 **+** 또는 **질문 가지 추가**로 모르는 내용을 연결합니다.
4. 이해한 개념은 학습 상태를 **이해함**으로 변경합니다.
5. 이 채팅에서 프로젝트와 질문을 알려주면 Codex가 같은 폴더의 문서를 확장할 수 있습니다.

앱에 LLM 호출이나 자체 채팅 기능은 포함되어 있지 않습니다. 학습 설명은 파일과 이 채팅을 통해 작성합니다. 예제의 학습 상태는 사용 방법을 보여주기 위한 샘플입니다.

## 캔버스 조작

| 동작              | 조작                                            |
| ----------------- | ----------------------------------------------- |
| 이동              | 트랙패드 스크롤, Space + 드래그, 이동 도구      |
| 확대 및 축소      | 트랙패드 핀치, 하단 + / −                       |
| 개념 선택 및 읽기 | 카드 클릭                                       |
| 개념 이동         | 카드 드래그                                     |
| 개념 연결         | 카드 오른쪽 점에서 다른 카드 왼쪽 점으로 드래그 |
| 전체 지도 보기    | 하단 전체 보기 버튼                             |
| 자동 배치         | 우측 상단 자동 정렬                             |
| 개념 및 문서 검색 | ⌘ / Ctrl + K                                    |
| 선택 / 이동 도구  | V / H                                           |
| 사이드바 접기     | ⌘ / Ctrl + B                                    |

프로젝트별 캔버스 위치와 문서 편집 초안은 브라우저에 보관합니다. **문서 저장**을 눌러야 Markdown 원본에 반영됩니다. 문서가 외부에서 수정되면 편집 중인 초안을 유지하고 충돌을 표시합니다. 브라우저 저장 공간을 사용할 수 없는 경우 초안은 현재 탭의 메모리에만 남습니다.

## 학습 데이터

```text
knowledge/
  llm/
    graph.json
    documents/
      language-model.md
      tokenization.md
      ...
```

`graph.json`에는 프로젝트, 개념, 학습 상태, 좌표, 연결을 저장합니다. 각 개념의 긴 설명은 `documents/` 안의 Markdown 파일에 저장합니다. 파일 변경은 Chokidar와 SSE로 감지하며, 화면 새로고침 없이 반영됩니다. 서버 연결이 복구되거나 탭으로 돌아왔을 때도 최신 데이터를 다시 읽습니다.

파일 작성 규칙과 예제는 [knowledge/AGENTS.md](knowledge/AGENTS.md)를 참조합니다. VS Code에서 `graph.json`을 편집할 때는 제공된 JSON Schema로 자동 완성과 기본 구조 검증을 사용할 수 있습니다. 실제 저장소는 ID 중복, 연결 대상, 문서 누락도 검사합니다.

오류가 있는 프로젝트는 목록에 표시하고 원본 파일을 그대로 유지합니다. 마지막으로 정상적으로 읽은 캔버스가 있는 경우 화면은 유지하되 쓰기 기능을 비활성화합니다. 원본 오류를 고치면 자동으로 복구됩니다.

파일 쓰기는 임시 파일 교체를 사용하고 앱 내 쓰기 요청을 직렬화합니다. API의 `revision`으로 오래된 요청의 덮어쓰기를 방지합니다. 외부 편집기와의 파일 변경은 데이터베이스 트랜잭션이 아니므로 여러 파일을 동시에 수정하는 중에는 잠시 검증 오류가 표시될 수 있습니다. 새 개념은 문서를 먼저 만들고 마지막에 그래프에 등록합니다.

상단 **내보내기**는 `{ graph, documents }` 형태의 JSON 백업을 다운로드합니다. 가져오기 UI는 제공하지 않습니다. 복원 시 `graph`를 프로젝트의 `graph.json`에, `documents`의 내용을 각 개념의 `document` 경로에 저장합니다.

## API와 검증

- Swagger UI: `/api/docs/`
- OpenAPI 3.1: `/api/openapi.json`
- 스키마 원본: `shared/schema.ts`
- API 구현: `server/api.ts`

```bash
npm run typecheck
npm test
npm run build
npm run format:check
```

테스트는 임시 디렉터리와 임시 포트를 사용하며 실제 `knowledge/` 데이터를 수정하지 않습니다. 프로젝트 생성, 가지 추가, 좌표 및 상태 저장, 문서 편집, 동시 저장 충돌, 잘못된 파일, 경로 보호, Swagger, SSE 파일 변경을 검증합니다.

## 참고

- [shadcn/ui · Sidebar Blocks](https://ui.shadcn.com/blocks/sidebar)의 `sidebar-07`을 학습 탐색에 맞게 수정했습니다.
- [React Flow · Viewport](https://reactflow.dev/learn/concepts/the-viewport)를 기반으로 캔버스 동작을 구성했습니다.
- LLM 예제 문서에 [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/4)와 [Attention Is All You Need](https://arxiv.org/abs/1706.03762)를 연결했습니다.

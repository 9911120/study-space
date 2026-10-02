# Study Space

Codex가 작성한 학습 문서를 지도 위에서 읽는 로컬 캔버스입니다. React, Vite, TypeScript, Tailwind CSS, shadcn/ui와 React Flow를 사용합니다.

## 실행

Node.js 22.12 이상과 pnpm 10.10.0을 사용합니다.

```bash
pnpm install
pnpm dev
```

개발서버는 사용자가 직접 실행합니다. 기본 주소는 `http://127.0.0.1:5173`이며 실제 주소는 터미널에 표시됩니다.

빌드 결과는 다음 명령으로 실행합니다.

```bash
pnpm build
pnpm start
```

기본 주소는 `http://127.0.0.1:4173`입니다. 파일 조회 API가 필요하므로 `dist`만 정적 호스팅하거나 `vite preview`만 실행하는 방식은 지원하지 않습니다.

## 사용

- 왼쪽에서 프로젝트를 선택합니다.
- 빈 공간 드래그나 트랙패드 스크롤로 캔버스를 이동합니다.
- 핀치 또는 하단의 확대·축소 버튼으로 크기를 조절합니다.
- 카드를 선택하면 문서를 읽을 수 있습니다. 문서의 닫기 버튼이나 캔버스 빈 공간을 누르면 닫힙니다.
- 상단 아이콘으로 라이트·다크 모드를 전환합니다.

화면은 읽기 전용입니다. 프로젝트 생성, 개념 편집, 연결 수정, 좌표 변경, 학습 상태 변경 기능은 제공하지 않습니다. 테마와 캔버스 시점만 브라우저에 보관합니다.

## 학습 내용 추가

이 채팅에서 새 주제나 후속 질문을 알려주시면 Codex가 아래 파일을 작성합니다.

```text
knowledge/
  llm/
    graph.json
    documents/
      language-model.md
      tokenization.md
      ...
```

`graph.json`은 개념·연결·배치를, Markdown은 설명을 담습니다. 파일이 변경되면 SSE로 화면에 자동 반영됩니다. 기존 파일의 상태·태그·색상 메타데이터는 보존하지만 화면에는 표시하지 않습니다.

파일 작성 규칙은 [knowledge/AGENTS.md](knowledge/AGENTS.md)에 정리되어 있습니다. 잘못된 파일은 오류로 표시하며 원본을 수정하지 않습니다.

## API와 검증

API는 로컬에서 조회만 허용합니다. 쓰기 요청은 `405 Method Not Allowed`로 거부합니다.

- `GET /api/projects`: 프로젝트 목록입니다.
- `GET /api/projects/:id`: 지도와 Markdown 문서입니다.
- `GET /api/events`: 파일 변경 알림입니다.
- `/api/docs/`: Swagger UI입니다.
- `/api/openapi.json`: OpenAPI 3.1 명세입니다.

```bash
pnpm check
pnpm format:check
```

테스트는 임시 파일과 임시 포트로 파일 조회, 외부 변경, 잘못된 경로, 쓰기 차단, Swagger와 SSE를 검증합니다. 실제 학습 파일을 변경하지 않습니다.

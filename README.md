# richEditor

바닐라 TypeScript + 클래스 기반 리치 에디터 예제입니다.

## 실행

```bash
npm install
npm run dev
```

빌드 확인:

```bash
npm run build
npm run test
```

환경 변수 설정(선택):

```bash
cp .env.example .env
```

- `VITE_MENTION_API_ENDPOINT`: 맨션 자동완성 목록을 가져올 API 주소 (기본값: `/api/mentions`)

## 포함 기능

- Toolbar 버튼과 `execCommand` 기반 명령 연결
- 텍스트 서식: 볼드/이탤릭/밑줄/취소선
- 리스트: 불릿/번호
- 표: 삽입, 행/열 추가, 다중 셀(Shift+클릭/드래그/Shift+방향키 + Ctrl/Cmd 비연속 선택), 직사각형 병합, 병합 해제(Unmerge), 단일 셀 우측 병합, 셀/컬럼 리사이징
- Table + 클릭 시 10x10 그리드 팝업에서 마우스 선택으로 행x열 지정 후 삽입
- 이미지: 파일 -> DataURL 삽입, 리사이징 핸들
- 폰트/크기/색상: `fontName`, `fontSize`, `foreColor`, `hiliteColor`
- 이모티콘: Unicode picker
- Undo/Redo + 키보드 단축키(Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z)
- Paste 정제: `cleanPaste` 유틸 + DOMPurify
- 저장/복구: localStorage
- 자동 저장: debounce
- 툴바 상태 동기화(서식/리스트 on/off/mixed tri-state, 색상 mixed 표시)
- 병합 셀 포함 선택 시 병합 범위를 자동 보정하고 상태 메시지 표시
- 병합 확장 프리뷰(점선 셀 하이라이트) 후 Merge 재클릭으로 확정
- 병합 프리뷰 중 Enter로 즉시 확정, Esc로 취소
- 병합 프리뷰 상태에서 Merge 버튼이 Confirm으로 변경되고 툴바에 확장 셀 수 배지 표시
- Confirm 상태는 초록 강조 스타일로 표시되며, 프리뷰 배지 클릭 시 즉시 취소
- Confirm 상태에서 병합 범위를 나타내는 행x열 미니 오버레이 배지 표시
- 범위 배지 클릭 시 병합 예정 영역이 잠깐 깜빡이며 포커스 표시
- 범위 플래시 강도 옵션: Flash Soft / Flash Normal / Flash Strong
- 플래시 강도 옵션은 localStorage에 저장되어 새로고침 후에도 유지
- Unmerge 내용 분배 모드도 localStorage에 저장되어 새로고침 후에도 유지
- Unmerge 내용 분배 옵션: Keep First / Duplicate / Clear All / Split Lines
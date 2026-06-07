# Rich Editor 코드 읽기 가이드

## 1) 아키텍처 개요
- 진입점: src/main.ts
- 핵심 클래스: src/rich-editor.ts
- 템플릿/팝업: src/rich-editor/template.ts, src/rich-editor/components/*-template(s).ts
- 이벤트 허브: src/rich-editor/components/event-bindings.ts
- 테이블 로직 분리:
  - 순수 좌표 계산: src/rich-editor/components/table-helpers.ts
  - 내비게이션: src/rich-editor/components/table-navigation.ts
  - 선택: src/rich-editor/components/table-selection.ts
  - 조작(추가/삭제/병합/분리): src/rich-editor/components/table-ops.ts

## 2) 주석 규칙 (Why / How / Pitfall)
- Why: 이 함수가 존재하는 이유, 사용자 UX 관점의 목적
- How: 구현 핵심 알고리즘/데이터 흐름
- Pitfall: 쉽게 깨지는 경계 조건, 회귀 포인트

이 규칙은 함수 상단 JSDoc 블록으로 유지한다.

## 3) 우선 읽을 순서
1. src/rich-editor.ts
2. src/rich-editor/components/event-bindings.ts
3. src/rich-editor/components/table-selection.ts
4. src/rich-editor/components/table-navigation.ts
5. src/rich-editor/components/table-helpers.ts
6. src/rich-editor/components/table-ops.ts

## 4) 핵심 상태 변수
- savedRange / toolbarInteractionRange / lastExpandedRange:
  툴바 상호작용 중 selection 복구를 위한 3단계 버퍼
- selectedCells / previewCells:
  실제 선택 셀과 병합 preview 셀 분리 관리
- keyboardAnchorCell / keyboardFocusCell:
  키보드 범위 선택의 기준점/현재점
- pendingExpandedMerge:
  병합 2단계(미리보기 -> 확정) 상태 플래그

## 5) 디버깅 팁
- Debug 패널을 켜고 table nav, restoreSelection, emoji select 로그를 확인한다.
- 표 이동 이슈는 먼저 isCaretAtCellBoundary 결과(atStart/atEnd)를 본다.
- 병합 이슈는 normalizeRectForSpans 결과 범위(rows/cols)와 preview count를 본다.

## 6) 변경 시 체크리스트
- selection 복구 경로가 바뀌면 emoji/color/table picker 삽입 위치를 재검증
- table-helpers 변경 시 navigation/selection/ops가 모두 영향을 받는지 확인
- 셀 높이/타이포 변경 시 최소 높이(28px) 유지 여부 확인
- 최종적으로 npm run build 통과 확인

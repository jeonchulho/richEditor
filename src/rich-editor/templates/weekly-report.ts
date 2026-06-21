export const WEEKLY_REPORT_TEMPLATE_HTML = `
  <h2 class="re-report-title">주간 업무보고서</h2>
  <table class="re-table re-report-sign-table">
    <tr>
      <td class="re-report-sign-head">담</td>
      <td class="re-report-sign-head">당</td>
      <td class="re-report-sign-head"></td>
      <td class="re-report-sign-head"></td>
    </tr>
    <tr>
      <td class="re-report-sign-body"></td>
      <td class="re-report-sign-body"></td>
      <td class="re-report-sign-body"></td>
      <td class="re-report-sign-body"></td>
    </tr>
  </table>
  <table class="re-table re-report-main-table">
    <tr>
      <td class="re-report-accent re-table-header-cell">기 간</td>
      <td colspan="2">20 년 8월 14일 ~ 20 년 8월 18일</td>
      <td class="re-table-header-cell">보고자</td>
      <td>김민지</td>
    </tr>
    <tr>
      <td class="re-report-accent re-table-header-cell">구 분</td>
      <td class="re-report-day-col re-table-header-cell">요일</td>
      <td class="re-table-header-cell">업무명</td>
      <td colspan="2" class="re-table-header-cell">업무실적</td>
    </tr>
    <tr>
      <td rowspan="6" class="re-report-accent re-report-section-cell re-table-header-cell">금주<br>업무실적</td>
      <td class="re-report-day-col">월</td>
      <td>- 주간 생산 스케줄 확인 및 조정<br>- 원재료 재고 현황 확인</td>
      <td colspan="2">- 스케줄 정상 조정 완료<br>- 5톤 부족</td>
    </tr>
    <tr>
      <td class="re-report-day-col">화</td>
      <td>- 제품 품질 점검<br>- 신제품 생산 라인 시험생산</td>
      <td colspan="2">- 3개 불량 발견<br>- 시험생산 정상 진행</td>
    </tr>
    <tr>
      <td class="re-report-day-col">수</td>
      <td>- 작업자 안전 교육 진행<br>- 생산 공정 최적화 회의</td>
      <td colspan="2">- 전체 인원 참석<br>- 2개 공정 개선안 도출</td>
    </tr>
    <tr>
      <td class="re-report-day-col">목</td>
      <td>- 제품 배송 준비<br>- 생산량 및 품질 보고서 작성</td>
      <td colspan="2">- 500개 제품 배송 준비 완료<br>- 보고서 초안 완성</td>
    </tr>
    <tr>
      <td class="re-report-day-col">금</td>
      <td>- 원재료 발주 계획<br>- 주간 생산 결과 회의</td>
      <td colspan="2">- 발주 계획서 작성 완료<br>- 주요 이슈 3개 도출</td>
    </tr>
    <tr>
      <td class="re-report-day-col">시간외</td>
      <td>기계 유지보수</td>
      <td colspan="2">2대 기계 보수 완료</td>
    </tr>
    <tr>
      <td class="re-report-accent re-report-section-cell re-table-header-cell">다음주<br>업무계획</td>
      <td colspan="4" class="re-report-bullets-cell">- 원재료 5톤 추가 발주 진행<br>- 불량 제품 원인 분석 및 개선 방안 마련<br>- 생산 공정 개선안 적용 및 효과 검증<br>- 안전 교육 내용 재점검 및 추가 교육 계획</td>
    </tr>
    <tr>
      <td colspan="2" class="re-table-header-cell">업무지시 및 추진사항</td>
      <td colspan="3" class="re-table-header-cell">애로 및 건의사항</td>
    </tr>
    <tr>
      <td colspan="2" class="re-report-note-cell">- 원재료 부족 문제에 대한 재고 관리 시스템 개선 요청<br>- 불량 제품에 대한 피드백을 품질 관리팀에 전달<br>- 다음주 중요한 생산 팀 강화 계획</td>
      <td colspan="3" class="re-report-note-cell">- 원재료 재고 관리 시스템의 정확성 문제 개선 필요<br>- 품질 점검 시간을 더 확보할 필요성 제기</td>
    </tr>
  </table>
`;

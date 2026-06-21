import { DAILY_CHECKLIST_TEMPLATE_HTML } from "./daily-checklist";
import { MEETING_NOTES_TEMPLATE_HTML } from "./meeting-notes";
import { PROJECT_STATUS_TEMPLATE_HTML } from "./project-status";
import { WEEKLY_REPORT_TEMPLATE_HTML } from "./weekly-report";

export type PresetTemplateType = "weeklyReport" | "meetingNotes" | "projectStatus" | "dailyChecklist";
export type PresetTemplateGroup = "reports" | "meetings" | "projects" | "checklists";
export const PRESET_TEMPLATE_GROUP_LABELS: Record<PresetTemplateGroup, string> = {
  reports: "보고",
  meetings: "회의",
  projects: "프로젝트",
  checklists: "체크리스트",
};

export type PresetTemplateMeta = {
  type: PresetTemplateType;
  label: string;
  group: PresetTemplateGroup;
  order: number;
};

export const PRESET_TEMPLATE_LIST: PresetTemplateMeta[] = [
  { type: "weeklyReport", label: "주간 업무보고서", group: "reports", order: 10 },
  { type: "meetingNotes", label: "회의록", group: "meetings", order: 20 },
  { type: "projectStatus", label: "프로젝트 현황", group: "projects", order: 30 },
  { type: "dailyChecklist", label: "일일 체크리스트", group: "checklists", order: 40 },
];

const PRESET_TEMPLATE_HTML_BY_TYPE: Record<PresetTemplateType, string> = {
  weeklyReport: WEEKLY_REPORT_TEMPLATE_HTML,
  meetingNotes: MEETING_NOTES_TEMPLATE_HTML,
  projectStatus: PROJECT_STATUS_TEMPLATE_HTML,
  dailyChecklist: DAILY_CHECKLIST_TEMPLATE_HTML,
};

export {
  DAILY_CHECKLIST_TEMPLATE_HTML,
  MEETING_NOTES_TEMPLATE_HTML,
  PROJECT_STATUS_TEMPLATE_HTML,
  WEEKLY_REPORT_TEMPLATE_HTML,
};

export function getPresetTemplateHtml(templateType: string): string | null {
  for (const preset of PRESET_TEMPLATE_LIST) {
    if (preset.type === templateType) {
      return PRESET_TEMPLATE_HTML_BY_TYPE[preset.type];
    }
  }

  return null;
}

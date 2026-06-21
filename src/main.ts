// 앱 진입점:
// 전역 스타일을 로드하고, #app 컨테이너에 RichEditor 인스턴스를 마운트한다.
import "./styles.css";
import { RichEditor } from "./rich-editor";
import {
  CHEVRON_DOWN_8,
  TEMPLATE_SELECT_14,
} from "./rich-editor/components/svg";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing app container");
}

const svgToDataUrl = (svgMarkup: string): string => `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}")`;

const applySvgCssVariables = (): void => {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--re-chevron-down-url", svgToDataUrl(CHEVRON_DOWN_8));
  rootStyle.setProperty("--re-template-select-url", svgToDataUrl(TEMPLATE_SELECT_14));
};

applySvgCssVariables();

const editor = new RichEditor(container, {
  // 에디터 문서 저장 키(localStorage)
  storageKey: "rich-editor:content",
  // 자동 저장은 일단 꺼두고 수동 저장만 사용한다.
  autosaveEnabled: false,
  // 입력 후 자동 저장 디바운스 지연(ms)
  autosaveDelay: 2000,
  // 맨션 자동완성 옵션
  mentions: {
    enabled: true,
    trigger: "@",
    maxResults: 8,
    items: ["김민지", "박준호", "이수현", "관리팀", "품질팀"],
  },
});

type MentionApiPayload = string[] | { items?: string[] };

const mentionApiEndpointFromEnv = import.meta.env.VITE_MENTION_API_ENDPOINT?.trim();
const MENTION_API_ENDPOINT = mentionApiEndpointFromEnv && mentionApiEndpointFromEnv.length > 0
  ? mentionApiEndpointFromEnv
  : null;

const normalizeMentionItems = (items: unknown): string[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return Array.from(new Set(items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)));
};

const parseMentionItems = (payload: MentionApiPayload): string[] => {
  if (Array.isArray(payload)) {
    return normalizeMentionItems(payload);
  }

  return normalizeMentionItems(payload.items);
};

const loadMentionItems = async (): Promise<void> => {
  if (!MENTION_API_ENDPOINT) {
    return;
  }

  try {
    const response = await fetch(MENTION_API_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json() as MentionApiPayload;
    const items = parseMentionItems(payload);
    if (items.length === 0) {
      return;
    }

    editor.configureMentions({ items });
  } catch {
    // 네트워크 오류 시에는 기본 맨션 후보를 유지한다.
  }
};

void loadMentionItems();

import { PRESET_TEMPLATE_GROUP_LABELS, PRESET_TEMPLATE_LIST } from "../../../templates";

export class TemplatePopupRenderer {
  // 템플릿 드롭다운 옵션을 메타데이터 기반으로 구성한다.
  public static renderPresetOptions(root: HTMLElement): void {
    const select = root.querySelector('[data-role="templatePreset"]') as HTMLSelectElement | null;
    if (!select) {
      return;
    }

    const currentValue = select.value;
    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "템플릿";
    placeholder.selected = true;
    select.appendChild(placeholder);

    const grouped = new Map<string, HTMLOptGroupElement>();
    const sorted = [...PRESET_TEMPLATE_LIST].sort((a, b) => a.order - b.order);

    for (const preset of sorted) {
      let group = grouped.get(preset.group);
      if (!group) {
        group = document.createElement("optgroup");
        group.label = PRESET_TEMPLATE_GROUP_LABELS[preset.group];
        grouped.set(preset.group, group);
        select.appendChild(group);
      }

      const option = document.createElement("option");
      option.value = preset.type;
      option.textContent = preset.label;
      group.appendChild(option);
    }

    if (currentValue) {
      select.value = currentValue;
    }
  }
}

export const renderTemplatePresetOptions = TemplatePopupRenderer.renderPresetOptions;

import { STANDARD_COLOR_SWATCHES, THEME_COLOR_SWATCHES } from "../../../constants";

export class ColorPopupRenderer {
  // 텍스트/배경 색상 스와치를 동적으로 생성한다.
  public static renderSwatches(root: HTMLElement): void {
    const themeGrid = root.querySelector('[data-role="themeColorGrid"]') as HTMLDivElement;
    const standardGrid = root.querySelector('[data-role="standardColorGrid"]') as HTMLDivElement;
    const recentGrid = root.querySelector('[data-role="recentColorGrid"]') as HTMLDivElement;

    themeGrid.innerHTML = "";
    standardGrid.innerHTML = "";
    recentGrid.innerHTML = "";

    for (const color of THEME_COLOR_SWATCHES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "re-color-swatch";
      button.dataset.colorValue = color;
      button.title = color;
      button.innerHTML = `<span class="re-swatch-preview" style="background:${color}"></span>`;
      themeGrid.appendChild(button);
    }

    for (const color of STANDARD_COLOR_SWATCHES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "re-color-swatch re-color-swatch-standard";
      button.dataset.colorValue = color;
      button.title = color;
      button.innerHTML = `<span class="re-swatch-preview" style="background:${color}"></span>`;
      standardGrid.appendChild(button);
    }

    for (let index = 0; index < 10; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "re-color-swatch re-color-swatch-empty";
      button.disabled = true;
      button.title = "최근 색상 없음";
      recentGrid.appendChild(button);
    }
  }
}

export const renderColorSwatches = ColorPopupRenderer.renderSwatches;

import { hidePopupElement, withPopupVisibleForLayout } from "./base-popup";

type ResolvePopup = () => HTMLElement | null;
type PositionPopup = (popup: HTMLElement) => void;

// 특정 팝업 요소를 lazy resolve하고, 표시/숨김/재배치를 공통화한다.
export class AnchoredPopupController {
  private readonly resolvePopup: ResolvePopup;
  private readonly positionPopup: PositionPopup;

  constructor(resolvePopup: ResolvePopup, positionPopup: PositionPopup) {
    this.resolvePopup = resolvePopup;
    this.positionPopup = positionPopup;
  }

  public isOpen(): boolean {
    const popup = this.resolvePopup();
    return Boolean(popup && !popup.hidden);
  }

  public show(): void {
    const popup = this.resolvePopup();
    if (!popup) {
      return;
    }

    withPopupVisibleForLayout(popup, () => {
      this.positionPopup(popup);
    });
  }

  public hide(): void {
    hidePopupElement(this.resolvePopup());
  }

  public toggle(): void {
    if (this.isOpen()) {
      this.hide();
      return;
    }

    this.show();
  }

  public repositionIfOpen(): void {
    if (!this.isOpen()) {
      return;
    }

    this.show();
  }
}

import { BasePopupPositioner, withPopupVisibleForLayout } from "./base-popup";

export class ModalDialogBase {
  protected readonly root: HTMLElement;
  protected readonly dialog: HTMLElement;
  protected readonly backdrop: HTMLElement;

  constructor(root: HTMLElement, dialog: HTMLElement, backdrop: HTMLElement) {
    this.root = root;
    this.dialog = dialog;
    this.backdrop = backdrop;
  }

  protected getShell(): HTMLElement | null {
    return this.root.querySelector(".re-shell") as HTMLElement | null;
  }

  public showCentered(preferred?: { left: number; top: number } | null): { left: number; top: number } | null {
    const shell = this.getShell();
    if (!shell) {
      return null;
    }

    this.backdrop.hidden = false;
    let clamped: { left: number; top: number } = { left: 8, top: 8 };
    withPopupVisibleForLayout(this.dialog, () => {
      const shellRect = shell.getBoundingClientRect();
      const dialogWidth = this.dialog.offsetWidth;
      const dialogHeight = this.dialog.offsetHeight;
      const centeredLeft = Math.max(12, Math.round((shellRect.width - dialogWidth) / 2));
      const centeredTop = Math.max(20, Math.round((shellRect.height - dialogHeight) / 2));
      const start = preferred ?? { left: centeredLeft, top: centeredTop };

      const maxLeft = Math.max(8, shellRect.width - dialogWidth - 8);
      const maxTop = Math.max(8, shellRect.height - dialogHeight - 8);
      clamped = {
        left: Math.min(maxLeft, Math.max(8, Math.round(start.left))),
        top: Math.min(maxTop, Math.max(8, Math.round(start.top))),
      };

      this.dialog.style.left = `${clamped.left}px`;
      this.dialog.style.top = `${clamped.top}px`;
    });

    return clamped;
  }

  public hide(): void {
    this.backdrop.hidden = true;
    this.dialog.hidden = true;
    this.dialog.classList.remove("is-dragging");
  }
}

export class ModelessDialogBase {
  protected readonly root: HTMLElement;
  protected readonly dialog: HTMLElement;

  constructor(root: HTMLElement, dialog: HTMLElement) {
    this.root = root;
    this.dialog = dialog;
  }

  protected getShell(): HTMLElement | null {
    return this.root.querySelector(".re-shell") as HTMLElement | null;
  }

  public showNear(anchor: HTMLElement, options: { centerAnchor?: boolean } = {}): void {
    const shell = this.getShell();
    if (!shell) {
      return;
    }

    withPopupVisibleForLayout(this.dialog, () => {
      BasePopupPositioner.positionNearAnchor(shell, anchor, this.dialog, options);
    });
  }

  public hide(): void {
    this.dialog.hidden = true;
  }
}

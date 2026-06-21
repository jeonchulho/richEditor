import { ModelessDialogBase } from "../dialog-base";

export class FormControlPropsDialogComponent extends ModelessDialogBase {
  constructor(root: HTMLElement, dialog: HTMLElement) {
    super(root, dialog);
  }

  public showFor(wrapper: HTMLElement): void {
    this.showNear(wrapper, { centerAnchor: true });
  }
}

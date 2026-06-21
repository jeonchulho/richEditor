import { BasePopupPositioner, withPopupVisibleForLayout } from "./base-popup";

export class ContextMenuBase {
  protected readonly root: HTMLElement;
  protected readonly menu: HTMLElement;

  constructor(root: HTMLElement, menu: HTMLElement) {
    this.root = root;
    this.menu = menu;
    this.bindSubmenuEvents();
  }

  protected getShell(): HTMLElement | null {
    return this.root.querySelector(".re-shell") as HTMLElement | null;
  }

  public showAt(clientX: number, clientY: number): void {
    const shell = this.getShell();
    if (!shell) {
      return;
    }

    withPopupVisibleForLayout(this.menu, () => {
      BasePopupPositioner.positionAtPoint(shell, this.menu, clientX, clientY);
    });
  }

  public hide(): void {
    this.closeAllSubmenus();
    this.menu.hidden = true;
  }

  private bindSubmenuEvents(): void {
    this.menu.addEventListener("mouseover", (event: Event) => {
      const target = event.target as HTMLElement;
      const item = target.closest("[data-submenu]") as HTMLElement | null;
      if (!item) {
        return;
      }

      this.openSubmenu(item.dataset.submenu ?? "");
    });

    this.menu.addEventListener("focusin", (event: Event) => {
      const target = event.target as HTMLElement;
      const item = target.closest("[data-submenu]") as HTMLElement | null;
      if (!item) {
        return;
      }

      this.openSubmenu(item.dataset.submenu ?? "");
    });

    this.menu.addEventListener("mouseleave", () => {
      this.closeAllSubmenus();
    });
  }

  private openSubmenu(name: string): void {
    this.closeAllSubmenus();
    if (!name) {
      return;
    }

    const trigger = this.menu.querySelector(`[data-submenu="${name}"]`) as HTMLElement | null;
    const submenu = this.menu.querySelector(`[data-submenu-for="${name}"]`) as HTMLElement | null;
    if (!trigger || !submenu) {
      return;
    }

    trigger.classList.add("is-open");
    submenu.hidden = false;
  }

  private closeAllSubmenus(): void {
    for (const node of Array.from(this.menu.querySelectorAll("[data-submenu]"))) {
      (node as HTMLElement).classList.remove("is-open");
    }

    for (const node of Array.from(this.menu.querySelectorAll("[data-submenu-for]"))) {
      (node as HTMLElement).hidden = true;
    }
  }
}

type AnchorPositionOptions = {
  centerAnchor?: boolean;
};

const POPUP_GAP = 8;

type PopupBounds = {
  width: number;
  height: number;
};

const clampPopupNearAnchor = (
  containerBounds: PopupBounds,
  anchorRect: DOMRect,
  popupRect: DOMRect,
  offsetLeft: number,
  offsetTop: number,
  options: AnchorPositionOptions = {},
): { left: number; top: number } => {
  const minLeft = POPUP_GAP;
  const maxLeft = Math.max(minLeft, containerBounds.width - popupRect.width - POPUP_GAP);
  const preferredLeft = options.centerAnchor
    ? offsetLeft + (anchorRect.width / 2) - (popupRect.width / 2)
    : offsetLeft;
  const left = Math.min(maxLeft, Math.max(minLeft, preferredLeft));

  const belowTop = offsetTop + anchorRect.height + POPUP_GAP;
  const aboveTop = offsetTop - popupRect.height - POPUP_GAP;
  const maxTop = Math.max(POPUP_GAP, containerBounds.height - popupRect.height - POPUP_GAP);
  const top = belowTop + popupRect.height <= containerBounds.height - POPUP_GAP
    ? belowTop
    : Math.max(POPUP_GAP, Math.min(maxTop, aboveTop));

  return { left, top };
};

export const withPopupVisibleForLayout = (popup: HTMLElement, positioner: () => void): void => {
  popup.hidden = false;
  popup.style.visibility = "hidden";
  positioner();
  popup.style.visibility = "";
};

export const hidePopupElement = (popup: HTMLElement | null | undefined): void => {
  if (!popup) {
    return;
  }

  popup.hidden = true;
};

export class BasePopupPositioner {
  // 기준 anchor 요소 근처에 팝업을 배치한다.
  // 화면 밖으로 벗어나지 않도록 좌표를 보정한다.
  public static positionNearAnchor(
    shell: HTMLElement,
    anchor: HTMLElement,
    popup: HTMLElement,
    options: AnchorPositionOptions = {},
  ): void {
    const anchorRect = anchor.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    const { left, top } = clampPopupNearAnchor(
      { width: shellRect.width, height: shellRect.height },
      anchorRect,
      popupRect,
      anchorRect.left - shellRect.left,
      anchorRect.top - shellRect.top,
      options,
    );

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  // fixed 좌표계를 사용하는 팝업(뷰포트 기준)을 anchor 근처에 배치한다.
  public static positionNearAnchorInViewport(
    anchor: HTMLElement,
    popup: HTMLElement,
    options: AnchorPositionOptions = {},
  ): void {
    const anchorRect = anchor.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    const { left, top } = clampPopupNearAnchor(
      { width: window.innerWidth, height: window.innerHeight },
      anchorRect,
      popupRect,
      anchorRect.left,
      anchorRect.top,
      options,
    );

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  // 마우스 좌표(주로 컨텍스트 메뉴 호출 위치)에 팝업을 배치한다.
  public static positionAtPoint(
    shell: HTMLElement,
    popup: HTMLElement,
    clientX: number,
    clientY: number,
  ): void {
    const shellRect = shell.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const minLeft = POPUP_GAP;
    const minTop = POPUP_GAP;
    const maxLeft = Math.max(minLeft, shellRect.width - popupRect.width - POPUP_GAP);
    const maxTop = Math.max(minTop, shellRect.height - popupRect.height - POPUP_GAP);
    const preferredLeft = clientX - shellRect.left;
    const preferredTop = clientY - shellRect.top;
    const left = Math.min(maxLeft, Math.max(minLeft, preferredLeft));
    const top = Math.min(maxTop, Math.max(minTop, preferredTop));

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }
}

export const positionPopupNearAnchor = BasePopupPositioner.positionNearAnchor;
export const positionPopupNearAnchorInViewport = BasePopupPositioner.positionNearAnchorInViewport;
export const positionPopupAtPoint = BasePopupPositioner.positionAtPoint;

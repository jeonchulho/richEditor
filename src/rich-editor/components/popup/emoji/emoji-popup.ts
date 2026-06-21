export class EmojiPopupRenderer {
  // 이모지 버튼 목록을 렌더링하고 선택 콜백을 연결한다.
  public static renderButtons(
    emojiPicker: HTMLDivElement,
    onSelect: (emoji: string) => void,
  ): void {
    const emojis = ["😀", "😁", "😂", "🤣", "😊", "😍", "😎", "🤔", "👍", "👏", "🔥", "🎉", "✅", "🚀", "💡", "📌"];
    emojiPicker.innerHTML = "";

    for (const emoji of emojis) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = emoji;
      btn.addEventListener("click", () => onSelect(emoji));
      emojiPicker.appendChild(btn);
    }
  }
}

export const renderEmojiButtons = EmojiPopupRenderer.renderButtons;

export namespace Styles {
  export enum Color {
    PINK = "#e385ed",
    WHITE = "#ffffffcc",
    YELLOW = "#ffbb33",
    GRAY = "#cccccc",
    GREEN = "#4CAF50",
    RED = "#F44336",
    BLACK = "#000000",
  }

  export class CardButton {
    static style: string = `
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: ${Color.PINK};
        border: none;
        border-radius: 10%;
        padding: 5px;
        cursor: pointer;
        color: ${Color.WHITE};
    `;
  }

  export class HeaderButton {
    static style: string = `
        background-color: ${Color.PINK};
        color: ${Color.WHITE};
        padding: 10px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
  }

  export class Toast {
    static style(isSuccess: boolean) {
      return `
        padding: 10px;
        background-color: ${isSuccess ? Styles.Color.GREEN : Styles.Color.RED};
        color: ${Color.WHITE};
        margin: 10px;
        border-radius: 5px;
      `;
    }
  }
}

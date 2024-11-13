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
        color: ${Color.WHITE};
    `;
  }

  export class AddPerformerButton {
    static style: string = `
      color: ${Color.PINK}
    `;
  }

  export class AddStudioButton {
    static style: string = `
      color: ${Color.PINK}
    `;
  }

  export class AddPerformerButtonLoading {
    static style: string = `
      color: ${Color.GRAY}
    `;
  }

  export class AddStudioButtonLoading {
    static style: string = `
      color: ${Color.GRAY}
    `;
  }

  export class HeaderButton {
    static style: string = `
        background-color: ${Color.PINK};
        color: ${Color.WHITE};
        padding: 10px;
        border: none;
        border-radius: 5px;
    `;
  }

  export class SearchAllAvailable {
    static style: string = `
        background-color: ${Color.PINK};
        color: ${Color.WHITE};
        padding: 10px;
        border: none;
        border-radius: 5px;
    `;
  }

  export class SearchAllExisting {
    static style: string = `
        background-color: ${Color.YELLOW};
        color: ${Color.BLACK};
        padding: 10px;
        border: none;
        border-radius: 5px;
      `;
  }
}

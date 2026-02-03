export const Styles = {
  Color: {
    PURPLE: '#7138C8',
    WHITE: '#ffffffcc',
    YELLOW: '#ffbb33',
    GRAY: '#cccccc',
    GREEN: '#4CAF50',
    RED: '#F44336',
    BLACK: '#000000',
  },
  CardButton: `
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: ${() => Styles.Color.PURPLE};
    border: none;
    border-radius: 10%;
    padding: 5px;
    color: ${() => Styles.Color.WHITE};
  `,
  AddPerformerButton: `
    color: ${() => Styles.Color.PURPLE};
  `,
  AddStudioButton: `
    color: ${() => Styles.Color.PURPLE};
  `,
  AddPerformerButtonLoading: `
    color: ${() => Styles.Color.GRAY};
  `,
  AddStudioButtonLoading: `
    color: ${() => Styles.Color.GRAY};
  `,
  HeaderButton: `
    background-color: ${() => Styles.Color.PURPLE};
    color: ${() => Styles.Color.WHITE};
    padding: 10px;
    border: none;
    border-radius: 5px;
  `,
  SearchAllAvailable: `
    background-color: ${() => Styles.Color.PURPLE};
    color: ${() => Styles.Color.WHITE};
    padding: 10px;
    border: none;
    border-radius: 5px;
  `,
  SearchAllExisting: `
    background-color: ${() => Styles.Color.YELLOW};
    color: ${() => Styles.Color.BLACK};
    padding: 10px;
    border: none;
    border-radius: 5px;
  `,
};

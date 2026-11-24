export type InputModeState =
  | {
      inputMode: 'normal';
      normalBuffer: string;
    }
  | {
      inputMode: 'lineInput';
      line: string;
    };

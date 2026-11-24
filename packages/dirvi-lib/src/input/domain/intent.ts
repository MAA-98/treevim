export type Intent = NormalModeIntent | CommandLineIntent;

export type NormalModeIntent =
  | {
      intentType: 'normalRight';
    }
  | {
      intentType: 'normalLeft';
    }
  | {
      intentType: 'normalDown';
    }
  | {
      intentType: 'normalUp';
    }
  | {
      intentType: 'setNormalBuffer';
      normalBuffer: string;
    };

export type CommandLineIntent =
  | {
      intentType: 'enterLineMode';
      type: 'ex' | 'code' | 'search' | 'shell';
    }
  | {
      intentType: 'setLine';
      line: string;
    }
  | {
      intentType: 'submitLine';
      line: string;
    }
  | {
      intentType: 'exitLineMode';
    };

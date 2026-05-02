const PIN_DIGIT_REPLACEMENTS: Record<string, string> = {
  '\u0660': '0',
  '\u0661': '1',
  '\u0662': '2',
  '\u0663': '3',
  '\u0664': '4',
  '\u0665': '5',
  '\u0666': '6',
  '\u0667': '7',
  '\u0668': '8',
  '\u0669': '9',
  '\u06f0': '0',
  '\u06f1': '1',
  '\u06f2': '2',
  '\u06f3': '3',
  '\u06f4': '4',
  '\u06f5': '5',
  '\u06f6': '6',
  '\u06f7': '7',
  '\u06f8': '8',
  '\u06f9': '9',
  '\uff10': '0',
  '\uff11': '1',
  '\uff12': '2',
  '\uff13': '3',
  '\uff14': '4',
  '\uff15': '5',
  '\uff16': '6',
  '\uff17': '7',
  '\uff18': '8',
  '\uff19': '9',
};

export const normalizePinInput = (value: string) =>
  Array.from(value.normalize('NFKC'))
    .map((character) => PIN_DIGIT_REPLACEMENTS[character] ?? character)
    .join('')
    .replace(/[^\d]/g, '');

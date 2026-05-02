import { describe, expect, it } from 'vitest';
import { normalizePinInput } from './pinUtils';

describe('normalizePinInput', () => {
  it('keeps ASCII digits unchanged', () => {
    expect(normalizePinInput('641730')).toBe('641730');
  });

  it('normalizes full-width Android keyboard digits', () => {
    expect(normalizePinInput('６４１７３０')).toBe('641730');
  });

  it('removes invisible separators around digits', () => {
    expect(normalizePinInput(' 641\u200b730 ')).toBe('641730');
  });

  it('normalizes Arabic-Indic digit variants', () => {
    expect(normalizePinInput('٦٤١٧٣٠')).toBe('641730');
    expect(normalizePinInput('۶۴۱۷۳۰')).toBe('641730');
  });
});

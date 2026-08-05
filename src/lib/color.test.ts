import { describe, expect, it } from 'vitest';

import { mix, withAlpha } from '@/lib/color';

describe('withAlpha', () => {
  it('keeps the hue and adds the alpha', () => {
    expect(withAlpha('#4E4C50', 0.5)).toBe('rgba(78, 76, 80, 0.5)');
    expect(withAlpha('F3F0E7', 1)).toBe('rgba(243, 240, 231, 1)');
  });
});

describe('mix', () => {
  it('lands on either end', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('rgb(0, 0, 0)');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('rgb(255, 255, 255)');
  });

  it('meets in the middle', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('rgb(128, 128, 128)');
  });

  /**
   * The property the cube stack depends on: what comes back is opaque, whatever
   * the ratio. A translucent fill would let the cubes behind show through the
   * ones in front — see the note on `mix`.
   */
  it('is never translucent', () => {
    for (const amount of [0, 0.16, 0.32, 0.5, 0.87, 1]) {
      expect(mix('#F3F0E7', '#4E4C50', amount)).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    }
  });

  it('clamps rather than extrapolating', () => {
    expect(mix('#000000', '#FFFFFF', -2)).toBe('rgb(0, 0, 0)');
    expect(mix('#000000', '#FFFFFF', 9)).toBe('rgb(255, 255, 255)');
  });
});

import { describe, expect, it } from 'vitest';

import { gradient, mix, withAlpha } from '@/lib/color';

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

describe('picking a colour off a ramp', () => {
  const RAMP = ['#000000', '#808080', '#FFFFFF'];

  it('lands on each stop', () => {
    expect(gradient(RAMP, 0)).toBe('#000000');
    expect(gradient(RAMP, 0.5)).toBe('#808080');
    expect(gradient(RAMP, 1)).toBe('#FFFFFF');
  });

  it('interpolates within a leg rather than across the whole ramp', () => {
    // A quarter of the way along is halfway down the first leg, not a quarter
    // of the way from black to white — which is the bug a two-stop-only
    // implementation would have.
    expect(gradient(RAMP, 0.25)).toBe('#404040');
    expect(gradient(RAMP, 0.75)).toBe('#C0C0C0');
  });

  it('clamps rather than extrapolating', () => {
    expect(gradient(RAMP, -3)).toBe('#000000');
    expect(gradient(RAMP, 42)).toBe('#FFFFFF');
  });

  /**
   * The property `mix` does not have and the reason this returns hex: the
   * mood ramp's resting colours are this fed straight into `mix`, and
   * `channels` only reads hex.
   */
  it('returns hex the other helpers can read', () => {
    for (const t of [0, 0.1, 0.37, 0.5, 0.83, 1]) {
      const picked = gradient(RAMP, t);
      expect(picked).toMatch(/^#[0-9A-F]{6}$/);
      expect(() => withAlpha(picked, 0.5)).not.toThrow();
    }
  });

  it('handles a one-stop ramp without dividing by zero', () => {
    expect(gradient(['#4E4C50'], 0.5)).toBe('#4E4C50');
  });
});

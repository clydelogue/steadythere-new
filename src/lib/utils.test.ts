import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (classname utility)', () => {
  describe('basic functionality', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles single class', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('handles multiple classes', () => {
      expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
    });
  });

  describe('conditional classes', () => {
    it('handles conditional classes with false', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('handles conditional classes with true', () => {
      expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
    });

    it('handles ternary conditions', () => {
      const isActive = true;
      expect(cn('base', isActive ? 'active' : 'inactive')).toBe('base active');
    });

    it('handles multiple conditionals', () => {
      const a = true;
      const b = false;
      expect(cn('base', a && 'a-class', b && 'b-class')).toBe('base a-class');
    });
  });

  describe('null and undefined handling', () => {
    it('handles undefined', () => {
      expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    });

    it('handles null', () => {
      expect(cn('foo', null, 'bar')).toBe('foo bar');
    });

    it('handles multiple null and undefined', () => {
      expect(cn('foo', undefined, null, undefined, 'bar')).toBe('foo bar');
    });

    it('handles only null and undefined', () => {
      expect(cn(undefined, null)).toBe('');
    });
  });

  describe('empty input', () => {
    it('handles empty input', () => {
      expect(cn()).toBe('');
    });

    it('handles empty strings', () => {
      expect(cn('', '', '')).toBe('');
    });

    it('handles empty strings mixed with valid classes', () => {
      expect(cn('foo', '', 'bar')).toBe('foo bar');
    });
  });

  describe('array of classes', () => {
    it('handles array of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('handles nested arrays', () => {
      expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
    });

    it('handles mixed arrays and strings', () => {
      expect(cn('start', ['foo', 'bar'], 'end')).toBe('start foo bar end');
    });

    it('handles arrays with conditionals', () => {
      const isActive = true;
      expect(cn(['base', isActive && 'active'])).toBe('base active');
    });
  });

  describe('tailwind-merge behavior', () => {
    it('merges conflicting padding classes', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('merges conflicting text color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('merges conflicting background classes', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('merges conflicting margin classes', () => {
      expect(cn('mt-2', 'mt-4')).toBe('mt-4');
    });

    it('merges conflicting width classes', () => {
      expect(cn('w-4', 'w-8')).toBe('w-8');
    });

    it('merges conflicting height classes', () => {
      expect(cn('h-4', 'h-8')).toBe('h-8');
    });

    it('keeps non-conflicting classes', () => {
      expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
    });

    it('handles flex direction conflicts', () => {
      expect(cn('flex-row', 'flex-col')).toBe('flex-col');
    });

    it('handles display class conflicts', () => {
      expect(cn('block', 'flex')).toBe('flex');
    });

    it('handles position class conflicts', () => {
      expect(cn('relative', 'absolute')).toBe('absolute');
    });

    it('handles border radius conflicts', () => {
      expect(cn('rounded', 'rounded-lg')).toBe('rounded-lg');
    });

    it('handles font weight conflicts', () => {
      expect(cn('font-normal', 'font-bold')).toBe('font-bold');
    });
  });

  describe('object syntax (clsx feature)', () => {
    it('handles object with boolean values', () => {
      expect(cn({ foo: true, bar: false })).toBe('foo');
    });

    it('handles object with multiple true values', () => {
      expect(cn({ foo: true, bar: true, baz: false })).toBe('foo bar');
    });

    it('handles mixed string and object', () => {
      expect(cn('base', { active: true, disabled: false })).toBe('base active');
    });

    it('handles empty object', () => {
      expect(cn({})).toBe('');
    });
  });

  describe('complex real-world scenarios', () => {
    it('handles typical button className pattern', () => {
      const isLoading = false;
      const variant = 'primary';
      const result = cn(
        'px-4 py-2 rounded font-medium',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        isLoading && 'opacity-50 cursor-not-allowed'
      );
      expect(result).toBe('px-4 py-2 rounded font-medium bg-blue-500 text-white');
    });

    it('handles component variant overrides', () => {
      const baseStyles = 'p-4 bg-white text-black';
      const customStyles = 'p-6 text-red-500';
      // tailwind-merge should pick the last conflicting value
      expect(cn(baseStyles, customStyles)).toBe('bg-white p-6 text-red-500');
    });

    it('handles responsive class combinations', () => {
      expect(cn('w-full', 'md:w-1/2', 'lg:w-1/3')).toBe('w-full md:w-1/2 lg:w-1/3');
    });

    it('handles state variant combinations', () => {
      expect(cn('bg-blue-500', 'hover:bg-blue-600', 'focus:bg-blue-700')).toBe(
        'bg-blue-500 hover:bg-blue-600 focus:bg-blue-700'
      );
    });
  });
});

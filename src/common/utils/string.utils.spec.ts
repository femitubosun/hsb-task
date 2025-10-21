import { toCamelCase, toKebabCase } from './string.utils';

describe('String Utils', () => {
  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('camelCase')).toBe('camel-case');
      expect(toKebabCase('myVariableName')).toBe('my-variable-name');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('PascalCase')).toBe('pascal-case');
      expect(toKebabCase('MyClassName')).toBe('my-class-name');
    });

    it('should handle spaces', () => {
      expect(toKebabCase('hello world')).toBe('hello-world');
      expect(toKebabCase('my test string')).toBe('my-test-string');
    });

    it('should handle underscores', () => {
      expect(toKebabCase('snake_case')).toBe('snake-case');
      expect(toKebabCase('my_variable_name')).toBe('my-variable-name');
    });

    it('should handle mixed cases', () => {
      expect(toKebabCase('myVariable_Name String')).toBe(
        'my-variable-name-string',
      );
    });

    it('should handle already kebab-case strings', () => {
      expect(toKebabCase('already-kebab-case')).toBe('already-kebab-case');
    });

    it('should handle single words', () => {
      expect(toKebabCase('word')).toBe('word');
      expect(toKebabCase('Word')).toBe('word');
    });

    it('should handle empty strings', () => {
      expect(toKebabCase('')).toBe('');
    });

    it('should handle consecutive capitals', () => {
      expect(toKebabCase('HTTPResponse')).toBe('httpresponse');
      expect(toKebabCase('XMLParser')).toBe('xmlparser');
    });

    it('should handle multiple spaces', () => {
      expect(toKebabCase('hello  world')).toBe('hello-world');
    });

    it('should handle multiple underscores', () => {
      expect(toKebabCase('hello__world')).toBe('hello-world');
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('kebab-case')).toBe('kebabCase');
      expect(toCamelCase('my-variable-name')).toBe('myVariableName');
    });

    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('snake_case')).toBe('snakeCase');
      expect(toCamelCase('my_variable_name')).toBe('myVariableName');
    });

    it('should handle spaces', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
      expect(toCamelCase('my test string')).toBe('myTestString');
    });

    it('should handle mixed separators', () => {
      expect(toCamelCase('my-variable_name string')).toBe(
        'myVariableNameString',
      );
    });

    it('should handle already camelCase strings', () => {
      expect(toCamelCase('alreadyCamelCase')).toBe('alreadycamelcase');
    });

    it('should handle PascalCase input', () => {
      expect(toCamelCase('PascalCase')).toBe('pascalcase');
    });

    it('should handle single words', () => {
      expect(toCamelCase('word')).toBe('word');
      expect(toCamelCase('WORD')).toBe('word');
    });

    it('should handle empty strings', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('should handle multiple separators', () => {
      expect(toCamelCase('hello--world')).toBe('helloWorld');
      expect(toCamelCase('hello__world')).toBe('helloWorld');
      expect(toCamelCase('hello  world')).toBe('helloWorld');
    });

    it('should handle trailing separators', () => {
      expect(toCamelCase('hello-world-')).toBe('helloWorld');
      expect(toCamelCase('hello_world_')).toBe('helloWorld');
    });

    it('should handle leading separators', () => {
      expect(toCamelCase('-hello-world')).toBe('HelloWorld');
      expect(toCamelCase('_hello_world')).toBe('HelloWorld');
    });
  });

  describe('round-trip conversions', () => {
    it('should handle camelCase to kebab-case and back', () => {
      const original = 'myVariableName';
      const kebab = toKebabCase(original);
      const backToCamel = toCamelCase(kebab);

      expect(kebab).toBe('my-variable-name');
      expect(backToCamel).toBe(original);
    });

    it('should handle kebab-case to camelCase and back', () => {
      const original = 'my-variable-name';
      const camel = toCamelCase(original);
      const backToKebab = toKebabCase(camel);

      expect(camel).toBe('myVariableName');
      expect(backToKebab).toBe(original);
    });
  });
});

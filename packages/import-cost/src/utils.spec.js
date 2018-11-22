import { getPackageDirectory, getPackageModuleContainer } from './utils';
import { expect } from 'chai';
import path from 'path';
import proxyquire from 'proxyquire';

describe('utils', () => {
  describe('getPackageDirectory', () => {
    it('should handle simple directory structure', () => {
      const pkg = {
        fileName: path.resolve('test', 'fixtures', 'import.js'),
        name: 'chai',
      };
      expect(getPackageDirectory(pkg)).to.eql(
        path.resolve('test', 'fixtures', 'node_modules', 'chai'),
      );
    });

    it('should handle a nested project structure', () => {
      const pkg = {
        fileName: path.resolve(
          'test',
          'fixtures',
          'yarn-workspace',
          'import-nested-project.js',
        ),
        name: 'chai',
      };
      expect(getPackageDirectory(pkg)).to.eql(
        path.resolve('test', 'fixtures', 'node_modules', 'chai'),
      );
    });

    it('should handle a nested project structure, with scoped package', () => {
      const pkg = {
        fileName: path.resolve(
          'test',
          'fixtures',
          'yarn-workspace',
          'import-with-scope.js',
        ),
        name: '@angular/core',
      };
      expect(getPackageDirectory(pkg)).to.eql(
        path.resolve('test', 'fixtures', 'node_modules', '@angular', 'core'),
      );
    });

    it('should handle a nested project structure, with scoped package and filename', () => {
      const pkg = {
        fileName: path.resolve(
          'test',
          'fixtures',
          'yarn-workspace',
          'import-with-scope-filename.js',
        ),
        name: '@angular/core/index.js',
      };
      expect(getPackageDirectory(pkg)).to.eql(
        path.resolve('test', 'fixtures', 'node_modules', '@angular', 'core'),
      );
    });

    it('should bail out when project directory is not found', () => {
      const utils = proxyquire('./utils', {
        'pkg-dir': {
          sync: () => null,
        },
      });

      const pkg = {
        fileName: path.resolve('test', 'fixtures', 'import.js'),
        name: 'chai',
      };
      const exception = 'Package directory not found [chai]';
      expect(() => utils.getPackageDirectory(pkg)).to.throw(exception);
    });
  });

  describe('getPackageModuleContainer', () => {
    it('should return the node_modules dir in the basic case', () => {
      const pkg = {
        fileName: path.resolve('test', 'fixtures', 'import.js'),
        name: 'chai',
      };
      expect(getPackageModuleContainer(pkg)).to.eql(
        path.resolve('test', 'fixtures', 'node_modules'),
      );
    });

    it('should return the node_modules dir for nested project structure', () => {
      const pkg = {
        fileName: path.resolve(
          'test',
          'fixtures',
          'yarn-workspace',
          'import-nested-project.js',
        ),
        name: 'chai',
      };
      expect(getPackageModuleContainer(pkg)).to.eql(
        path.resolve('test', 'fixtures', 'node_modules'),
      );
    });
  });
});

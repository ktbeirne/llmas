/**
 * FSD Architecture Tests - Phase 1
 * Feature-Sliced Designアーキテクチャの遵守を確認するテスト
 */

import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import path from 'path';

describe('FSD Architecture Compliance', () => {
  describe('Layer Dependencies', () => {
    it('should not import from features to shared', async () => {
      const sharedFiles = await glob('src/shared/**/*.{ts,tsx}', { 
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts']
      });
      
      for (const file of sharedFiles) {
        const content = readFileSync(file, 'utf-8');
        const importStatements = content.match(/import .* from ['"].*['"]/g) || [];
        
        const hasFeatureImport = importStatements.some(statement => 
          statement.includes('@features/') || 
          statement.includes('../features/') ||
          statement.includes('../../features/')
        );
        
        expect(hasFeatureImport, `${file} imports from features layer`).toBe(false);
      }
    });

    it('should not import feature internals from other features', async () => {
      const featureFiles = await glob('src/features/**/*.{ts,tsx}', {
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts']
      });
      
      for (const file of featureFiles) {
        const content = readFileSync(file, 'utf-8');
        const currentFeature = file.split('/')[2]; // src/features/[feature-name]/...
        
        const importStatements = content.match(/import .* from ['"].*['"]/g) || [];
        
        const invalidImports = importStatements.filter(statement => {
          // 他のFeatureの内部ファイルへの直接インポートをチェック
          const match = statement.match(/from ['"](.*features\/([^/]+)\/(?!index).*)['"]/);
          if (match) {
            const targetFeature = match[2];
            return targetFeature !== currentFeature;
          }
          return false;
        });
        
        expect(invalidImports, `${file} has invalid cross-feature imports`).toHaveLength(0);
      }
    });

    it('should export public API through index.ts', async () => {
      const features = await glob('src/features/*', { onlyDirectories: true });
      
      for (const featureDir of features) {
        const indexPath = path.join(featureDir, 'index.ts');
        const hasIndex = await glob(indexPath).then(files => files.length > 0);
        
        expect(hasIndex, `${featureDir} missing index.ts`).toBe(true);
        
        if (hasIndex) {
          const content = readFileSync(indexPath, 'utf-8');
          const hasExports = content.includes('export');
          expect(hasExports, `${indexPath} has no exports`).toBe(true);
        }
      }
    });
  });

  describe('Naming Conventions', () => {
    it('should use kebab-case for feature directories', async () => {
      const features = await glob('src/features/*', { onlyDirectories: true });
      
      for (const featureDir of features) {
        const featureName = path.basename(featureDir);
        const isKebabCase = /^[a-z]+(-[a-z]+)*$/.test(featureName);
        
        expect(isKebabCase, `${featureName} is not kebab-case`).toBe(true);
      }
    });

    it('should use proper file naming conventions', async () => {
      const files = await glob('src/**/*.{ts,tsx}', {
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts', '**/index.ts']
      });
      
      for (const file of files) {
        const fileName = path.basename(file, path.extname(file));
        const isComponent = file.endsWith('.tsx') && /^[A-Z]/.test(fileName);
        const isUtility = file.endsWith('.ts') && /^[a-z]/.test(fileName);
        
        if (file.includes('/ui/')) {
          expect(isComponent, `UI file ${file} should be PascalCase`).toBe(true);
        } else if (file.includes('/lib/') || file.includes('/model/')) {
          expect(isUtility, `Utility file ${file} should be camelCase`).toBe(true);
        }
      }
    });
  });

  describe('Directory Structure', () => {
    it('should have required FSD layers', async () => {
      const requiredLayers = ['app', 'features', 'shared', 'widgets', 'entities'];
      
      for (const layer of requiredLayers) {
        const layerPath = `src/${layer}`;
        const exists = await glob(layerPath).then(files => files.length > 0);
        
        expect(exists, `Required layer ${layer} is missing`).toBe(true);
      }
    });

    it('should follow feature internal structure', async () => {
      const features = await glob('src/features/*', { onlyDirectories: true });
      const recommendedDirs = ['model', 'ui', 'api', 'lib', 'types'];
      
      for (const featureDir of features) {
        const featureName = path.basename(featureDir);
        
        // 少なくとも1つの推奨ディレクトリが存在することを確認
        const existingDirs = await Promise.all(
          recommendedDirs.map(async dir => {
            const dirPath = path.join(featureDir, dir);
            const exists = await glob(dirPath).then(files => files.length > 0);
            return exists ? dir : null;
          })
        );
        
        const hasStructure = existingDirs.some(dir => dir !== null);
        expect(hasStructure, `${featureName} has no internal structure`).toBe(true);
      }
    });
  });
});

describe('Code Quality Gates', () => {
  it('should have tests for features', async () => {
    const features = await glob('src/features/*', { onlyDirectories: true });
    
    for (const featureDir of features) {
      const testFiles = await glob(`${featureDir}/**/*.test.{ts,tsx}`);
      const hasTests = testFiles.length > 0;
      
      expect(hasTests, `${featureDir} has no tests`).toBe(true);
    }
  });

  it('should not have console.log in production code', async () => {
    const sourceFiles = await glob('src/**/*.{ts,tsx}', {
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts', '**/logger.ts']
    });
    
    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8');
      const hasConsoleLog = content.includes('console.log(');
      
      expect(hasConsoleLog, `${file} contains console.log`).toBe(false);
    }
  });
});
/**
 * ESLint Configuration for Feature-Sliced Design
 * FSDアーキテクチャ違反を防ぐためのルール設定
 */

export default [
  {
    // Features層のルール
    files: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
    rules: {
      // Feature間の直接import禁止（簡略化して確実に動作させる）
      'no-restricted-imports': ['error', {
        patterns: [
          // 他のFeatureの内部ディレクトリへの直接アクセス禁止
          '../*/model/*',
          '../*/ui/*',
          '../*/api/*',
          '../*/lib/*',
          '../*/types/*',
          '../../*/model/*',
          '../../*/ui/*',
          '../../*/api/*',
          '../../*/lib/*',
          '../../*/types/*'
        ]
      }]
    }
  },
  
  {
    // Shared層のルール
    files: ['src/shared/**/*.ts', 'src/shared/**/*.tsx'],
    rules: {
      // SharedからFeatures/Widgets/Appへのimport禁止
      'no-restricted-imports': ['error', {
        patterns: [
          '**/features/*',
          '**/widgets/*',
          '**/app/*',
          '**/entities/*'
        ],
        paths: [
          {
            name: '@features',
            message: 'Shared層からFeatures層へのimportは禁止されています'
          },
          {
            name: '@widgets',
            message: 'Shared層からWidgets層へのimportは禁止されています'
          },
          {
            name: '@app',
            message: 'Shared層からApp層へのimportは禁止されています'
          }
        ]
      }]
    }
  },
  
  {
    // Entities層のルール
    files: ['src/entities/**/*.ts', 'src/entities/**/*.tsx'],
    rules: {
      // EntitiesからFeatures/Widgets/Appへのimport禁止
      'no-restricted-imports': ['error', {
        patterns: [
          '**/features/*',
          '**/widgets/*',
          '**/app/*'
        ],
        paths: [
          {
            name: '@features',
            message: 'Entities層からFeatures層へのimportは禁止されています'
          },
          {
            name: '@widgets',
            message: 'Entities層からWidgets層へのimportは禁止されています'
          },
          {
            name: '@app',
            message: 'Entities層からApp層へのimportは禁止されています'
          }
        ]
      }]
    }
  },
  
  {
    // Widgets層のルール
    files: ['src/widgets/**/*.ts', 'src/widgets/**/*.tsx'],
    rules: {
      // WidgetsからAppへのimport禁止
      'no-restricted-imports': ['error', {
        patterns: ['**/app/*'],
        paths: [
          {
            name: '@app',
            message: 'Widgets層からApp層へのimportは禁止されています'
          }
        ]
      }]
    }
  },
  
  {
    // 全体的なルール
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      // 相対パスでの上位階層アクセス制限
      'no-restricted-imports': ['error', {
        patterns: [
          // 3階層以上の親ディレクトリへのアクセス禁止
          '../../../*',
          '../../../../*'
        ]
      }]
    }
  }
];
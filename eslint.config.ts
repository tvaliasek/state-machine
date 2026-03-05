import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'

const tsconfig = defineConfig(
    globalIgnores(['dist/**/*', 'node_modules', 'public/**/*', '.history', 'coverage/**/*', 'examples/nestjs-mongoose-adapter/**', 'jest.config.js']),
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['tests/*.ts', 'examples/*/*.ts', 'jest.config.ts'],
                    maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 10
                },
                tsconfigRootDir: __dirname
            }
        }
    }
)

export default [
    ...tsconfig,
    stylistic.configs['recommended'],
    stylistic.configs.customize({
        indent: 4,
        jsx: false,
        semi: false,
        commaDangle: 'never',
        braceStyle: '1tbs'
    }),
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '!**/*.d.ts'],
        rules: {
            '@typescript-eslint/no-magic-numbers': 'off',
            '@typescript-eslint/max-params': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/no-unsafe-type-assertion': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-unnecessary-type-parameters': 'off',
            '@typescript-eslint/no-deprecated': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unnecessary-condition': 'warn',
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-base-to-string': 'warn',
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true
                }
            ],
            '@stylistic/indent': ['error', 4],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
        }
    }
]

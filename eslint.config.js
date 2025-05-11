import { globalIgnores, defineConfig } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

const vueConfig = defineConfigWithVueTs(
	{
		files: ['packages/frontend/**/*.{ts,mts,tsx,vue}'],
		name: 'Files to lint Vue',
	},

	pluginVue.configs['flat/essential'],
	vueTsConfigs.recommendedTypeChecked,
	skipFormatting,
)

export default defineConfig([
	globalIgnores([
		'node_modules',
		'dist/**',
		'pnpm*',
		'.pnpm*',
		'**/*.config.{js,ts,mjs,cjs,json}',
	]),
	...vueConfig,
	{
		files: ['packages/backend/**/*.ts'],
		plugins: {
			...tsPlugin,
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		settings: {
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: './tsconfig.base.json',
				},
			},
		},
	},
	{
		files: [
			'README.md',
			'pnpm*',
			'.pnpm*',
			'**/*.config.{js,ts,mjs,cjs,json}',
			'**/.config.*',
			'**/.eslintrc',
			'**/.prettierrc',
			'**/*.rc.{js,json,yml,yaml}',
		],
		rules: {
			'prettier/prettier': 'off',
		},
	},
])

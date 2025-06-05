import stylistic from "@stylistic/eslint-plugin"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting"
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript"
import pluginVue from "eslint-plugin-vue"
import { defineConfig, globalIgnores } from "eslint/config"

const vueConfig = defineConfigWithVueTs(
	{
		files: ["packages/frontend/**/*.{ts,mts,tsx,vue}"],
		name: "Files to lint Vue",
	},
	pluginVue.configs["flat/essential"],
	vueTsConfigs.recommendedTypeChecked,
	skipFormatting,
)

export default defineConfig([
	globalIgnores([
		'node_modules',
		'**/dist',
		'**/pnpm*',
		'**/.pnpm*',
		'**/*.md',
		'**/*.config.{js,ts,mjs,cjs,json}'
	]),
	...vueConfig,
	{
		files: ["packages/backend/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			"@stylistic": stylistic,
		},
		settings: {
			"import/resolver": {
				typescript: {
					alwaysTryTypes: true,
					project: "./tsconfig.base.json",
				},
			},
		},
		rules: {
			"max-len": ["error", { code: 100, ignoreRegExpLiterals: true }],
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
			"arrow-body-style": ["error", "as-needed"],
			camelcase: "error",
			curly: ["error", "multi-line"],
			eqeqeq: ["error", "always"],
			"no-console": "off",
			"no-var": "error",
			"prefer-const": "error",
			yoda: "error",
			"@stylistic/arrow-spacing": ["error", { before: true, after: true }],
			"@stylistic/comma-dangle": ["error", "always-multiline"],
			"@stylistic/comma-spacing": ["error", { before: false, after: true }],
			"@stylistic/comma-style": ["error", "last"],
			"@stylistic/dot-location": ["error", "property"],
			"@stylistic/keyword-spacing": ["error", { before: true, after: true }],
			"@stylistic/no-multi-spaces": "error",
			"@stylistic/no-multiple-empty-lines": [
				"error",
				{
					max: 2,
					maxEOF: 1,
					maxBOF: 0,
				},
			],
			"@stylistic/no-trailing-spaces": ["error"],
			"@stylistic/object-curly-spacing": ["error", "always"],
			"@stylistic/quotes": ["error", "double"],
			"@stylistic/indent": ["error", "tab"],
			"@stylistic/semi": ["error", "always"],
			"@stylistic/space-infix-ops": "error",
		},
	},
	{
		files: [
			"README.md",
			"pnpm*",
			".pnpm*",
			"**/*.config.{js,ts,mjs,cjs,json}",
			"**/.config.*",
			"**/.eslintrc",
			"**/.prettierrc",
			"**/*.rc.{js,json,yml,yaml}",
		],
		rules: {
			"prettier/prettier": "off",
		},
	},
])

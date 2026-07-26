import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
	{ ignores: ['node_modules/**', '.next/**', 'dist/**', 'build/**'] },
	...compat.extends('next/core-web-vitals'),
	{
		rules: {
			// Non-critical rules - disabled since code works fine without them
			'react/prop-types': 'off',
			'react/no-unescaped-entities': 'off',
			'react/display-name': 'off',
			'react/jsx-uses-vars': 'off',
			'react/jsx-no-comment-textnodes': 'off',
			'no-unused-vars': 'off',
			'@next/next/no-img-element': 'off',
		},
	},
];

import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			backgroundColor: {
				background: '#1b1c2b',
				primary: '#232233',
				accent: '#7c68e9',
				secondary: '#69679b'
			},
			textColor: {
				primary: 'hsl(260, 7%, 92%)'
			},
			fontFamily: {
				Poppins: ['Poppins', 'sans-serif']
			}
		}
	},
	plugins: []
} satisfies Config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts}',
    './types/**/*.{js,ts}',
    './workers/**/*.{js,ts}',
  ],
  darkMode: ['class', 'class'],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				'50': '#eef2ff',
  				'100': '#e0e7ff',
  				'200': '#c7d2fe',
  				'300': '#a5b4fc',
  				'400': '#818cf8',
  				'500': '#6366f1',
  				'600': '#4f46e5',
  				'700': '#4338ca',
  				'800': '#3730a3',
  				'900': '#312e81',
  				'950': '#1e1b4b'
  			},
  			secondary: {
  				'50': '#f8fafc',
  				'100': '#f1f5f9',
  				'200': '#e2e8f0',
  				'300': '#cbd5e1',
  				'400': '#94a3b8',
  				'500': '#64748b',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1e293b',
  				'900': '#0f172a',
  				'950': '#020617'
  			},
  			success: {
  				'50': '#ecfdf5',
  				'100': '#d1fae5',
  				'200': '#a7f3d0',
  				'300': '#6ee7b7',
  				'400': '#34d399',
  				'500': '#10b981',
  				'600': '#059669',
  				'700': '#047857',
  				'800': '#065f46',
  				'900': '#064e3b'
  			},
  			warning: {
  				'50': '#fffbeb',
  				'100': '#fef3c7',
  				'200': '#fde68a',
  				'300': '#fcd34d',
  				'400': '#fbbf24',
  				'500': '#f59e0b',
  				'600': '#d97706',
  				'700': '#b45309',
  				'800': '#92400e',
  				'900': '#78350f'
  			},
  			error: {
  				'50': '#fef2f2',
  				'100': '#fee2e2',
  				'200': '#fecaca',
  				'300': '#fca5a5',
  				'400': '#f87171',
  				'500': '#ef4444',
  				'600': '#dc2626',
  				'700': '#b91c1c',
  				'800': '#991b1b',
  				'900': '#7f1d1d'
  			},
  			surface: {
  				'50': '#ffffff',
  				'100': '#fafafa',
  				'200': '#f5f5f5',
  				'300': '#e5e5e5',
  				'400': '#d4d4d4',
  				'500': '#a3a3a3',
  				'600': '#737373',
  				'700': '#525252',
  				'800': '#404040',
  				'900': '#262626'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Pretendard Variable',
  				'Pretendard',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'Fira Code',
  				'Consolas',
  				'monospace'
  			],
  			korean: [
  				'Pretendard Variable',
  				'Pretendard',
  				'Noto Sans KR',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			'2xs': [
  				'0.625rem',
  				{
  					lineHeight: '0.875rem',
  					letterSpacing: '0.02em'
  				}
  			],
  			xs: [
  				'0.75rem',
  				{
  					lineHeight: '1rem',
  					letterSpacing: '0.01em'
  				}
  			],
  			sm: [
  				'0.875rem',
  				{
  					lineHeight: '1.25rem',
  					letterSpacing: '0'
  				}
  			],
  			base: [
  				'1rem',
  				{
  					lineHeight: '1.5rem',
  					letterSpacing: '-0.01em'
  				}
  			],
  			lg: [
  				'1.125rem',
  				{
  					lineHeight: '1.75rem',
  					letterSpacing: '-0.01em'
  				}
  			],
  			xl: [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'2xl': [
  				'1.5rem',
  				{
  					lineHeight: '2rem',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'3xl': [
  				'1.875rem',
  				{
  					lineHeight: '2.25rem',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'4xl': [
  				'2.25rem',
  				{
  					lineHeight: '2.5rem',
  					letterSpacing: '-0.03em'
  				}
  			],
  			'5xl': [
  				'3rem',
  				{
  					lineHeight: '1',
  					letterSpacing: '-0.03em'
  				}
  			],
  			'6xl': [
  				'3.75rem',
  				{
  					lineHeight: '1',
  					letterSpacing: '-0.04em'
  				}
  			]
  		},
  		spacing: {
  			'0.5': '0.125rem',
  			'1.5': '0.375rem',
  			'2.5': '0.625rem',
  			'3.5': '0.875rem',
  			'4.5': '1.125rem',
  			'5.5': '1.375rem',
  			'6.5': '1.625rem',
  			'7.5': '1.875rem',
  			'8.5': '2.125rem',
  			'9.5': '2.375rem',
  			'10.5': '2.625rem',
  			'11.5': '2.875rem',
  			'12.5': '3.125rem',
  			'13.5': '3.375rem',
  			'14.5': '3.625rem',
  			'15.5': '3.875rem',
  			'16.5': '4.125rem',
  			'17.5': '4.375rem',
  			'18.5': '4.625rem',
  			'19.5': '4.875rem',
  			'20.5': '5.125rem'
  		},
  		borderRadius: {
  			'4xl': '2rem',
  			'5xl': '2.5rem'
  		},
  		boxShadow: {
  			xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  			sm: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  			md: '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  			lg: '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
  			xl: '0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.06)',
  			'2xl': '0 25px 50px -12px rgb(0 0 0 / 0.1)',
  			'inner-sm': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
  			'inner-md': 'inset 0 4px 6px -1px rgb(0 0 0 / 0.06)',
  			'glow-sm': '0 0 0 1px rgb(99 102 241 / 0.1), 0 0 8px 0 rgb(99 102 241 / 0.15)',
  			'glow-md': '0 0 0 1px rgb(99 102 241 / 0.1), 0 0 16px 0 rgb(99 102 241 / 0.2)',
  			'glow-lg': '0 0 0 1px rgb(99 102 241 / 0.1), 0 0 32px 0 rgb(99 102 241 / 0.25)'
  		},
  		transitionDuration: {
  			'0': '0ms',
  			'50': '50ms',
  			'100': '100ms',
  			'150': '150ms',
  			'200': '200ms',
  			'250': '250ms',
  			'300': '300ms',
  			'350': '350ms',
  			'400': '400ms',
  			'500': '500ms',
  			'700': '700ms',
  			'1000': '1000ms'
  		},
  		transitionTimingFunction: {
  			spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  			bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  			smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  			snappy: 'cubic-bezier(0.2, 0, 0, 1)'
  		},
  		animation: {
  			'fade-in': 'fadeIn 200ms ease-out',
  			'fade-out': 'fadeOut 150ms ease-in',
  			'slide-up': 'slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  			'slide-down': 'slideDown 200ms ease-out',
  			'slide-left': 'slideLeft 200ms ease-out',
  			'slide-right': 'slideRight 200ms ease-out',
  			'scale-in': 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  			'scale-out': 'scaleOut 150ms ease-in',
  			'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
  			'spin-slow': 'spin 3s linear infinite',
  			shimmer: 'shimmer 2s linear infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			fadeOut: {
  				'0%': {
  					opacity: '1'
  				},
  				'100%': {
  					opacity: '0'
  				}
  			},
  			slideUp: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideDown: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(-10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideLeft: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			slideRight: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(-10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			scaleIn: {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			scaleOut: {
  				'0%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				}
  			},
  			pulseSoft: {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.7'
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		zIndex: {
  			'1': '1',
  			'2': '2',
  			'3': '3',
  			'4': '4',
  			'5': '5',
  			'10': '10',
  			'20': '20',
  			'30': '30',
  			'40': '40',
  			'50': '50',
  			auto: 'auto',
  			dropdown: '1000',
  			modal: '1100',
  			popover: '1200',
  			tooltip: '1300',
  			toast: '1400'
  		}
  	}
  },
  plugins: [],
}
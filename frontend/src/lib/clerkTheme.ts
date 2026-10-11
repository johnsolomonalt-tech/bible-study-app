import type { ComponentProps } from 'react';
import type { SignIn } from '@clerk/nextjs';

export type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

/**
 * Theologica Brand Clerk Theme
 * 
 * Harmonized with Theologica's signature design system:
 * - Terracotta primary accent: #c96442
 * - Reverent dark surface / responsive theme variables
 * - Inter body typography & Merriweather serif accents
 * - Soft rounded-2xl/rounded-3xl luxury geometry
 */
export const theologicaClerkAppearance: ClerkAppearance = {
  options: {
    logoPlacement: 'none',
    socialButtonsVariant: 'blockButton',
    socialButtonsPlacement: 'bottom',
  },
  variables: {
    colorPrimary: '#c96442',
    colorPrimaryForeground: '#faf9f5',
    colorBackground: '#242422',
    colorForeground: '#faf9f5',
    colorMuted: '#3d3d3a',
    colorMutedForeground: '#b0aea5',
    colorInput: '#1a1a18',
    colorInputForeground: '#faf9f5',
    colorBorder: '#4d4c48',
    colorDanger: '#ef4444',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    borderRadius: '0.875rem',
    fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
  },
  elements: {
    rootBox: 'w-full max-w-[420px] mx-auto',
    card: 'bg-surface border border-border-soft/70 shadow-2xl rounded-3xl p-6 sm:p-8 backdrop-blur-sm text-fg',
    cardBox: 'shadow-none border-0 bg-transparent',
    headerTitle: 'font-serif text-2xl font-bold text-fg tracking-tight text-center',
    headerSubtitle: 'text-xs text-muted text-center mt-1 leading-relaxed',
    socialButtonsBlockButton: 'bg-bg/80 hover:bg-surface-hover text-fg border border-border-soft/80 rounded-xl py-2.5 transition-colors cursor-pointer shadow-xs',
    socialButtonsBlockButtonText: 'text-fg font-medium text-xs sm:text-sm',
    dividerRow: 'my-4',
    dividerLine: 'bg-border-soft/60',
    dividerText: 'text-[10px] font-bold uppercase tracking-widest text-muted',
    formFieldLabel: 'text-[11px] font-bold uppercase tracking-wider text-muted mb-1',
    formFieldInput: 'bg-bg border border-border-soft text-fg text-sm rounded-xl px-3.5 py-2.5 focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-muted/60',
    formButtonPrimary: 'bg-accent hover:bg-[#b5583b] text-accent-on font-semibold py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer text-sm',
    footerActionText: 'text-xs text-muted',
    footerActionLink: 'text-xs text-accent font-semibold hover:underline',
    identityPreviewText: 'text-sm font-medium text-fg',
    identityPreviewEditButton: 'text-accent text-xs hover:underline font-medium',
    formResendCodeLink: 'text-accent text-xs hover:underline font-medium',
    otpCodeFieldInput: 'border border-border-soft bg-bg text-fg rounded-xl text-lg font-bold focus:border-accent focus:ring-1 focus:ring-accent',
    footer: 'bg-transparent border-t border-border-soft/30 pt-4 mt-4',
    userButtonPopoverCard: 'bg-surface border border-border-soft/80 shadow-2xl rounded-2xl text-fg',
    userButtonPopoverActionButton: 'hover:bg-surface-hover text-fg transition-colors',
    userButtonPopoverActionButtonText: 'text-fg text-xs font-medium',
    userButtonPopoverFooter: 'hidden',
  },
};

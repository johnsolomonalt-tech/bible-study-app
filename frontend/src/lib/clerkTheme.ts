import type { ComponentProps } from 'react';
import type { SignIn } from '@clerk/nextjs';

export type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

/**
 * Theologica Brand Clerk Theme
 * 
 * Harmonized with Theologica's signature design system:
 * - Terracotta primary accent: #c96442
 * - Unified seamless dark surface (removes split card footer)
 * - Inter body typography & Merriweather serif accents
 * - High-contrast readable social buttons (fixes black-on-black text)
 * - Clean input borders and focus rings
 */
export const theologicaClerkAppearance: ClerkAppearance = {
  options: {
    logoPlacement: 'none',
    socialButtonsVariant: 'blockButton',
    socialButtonsPlacement: 'bottom',
  },
  variables: {
    colorPrimary: '#c96442',
    colorPrimaryForeground: '#ffffff',
    colorNeutral: '#faf9f5', // Sets light foreground contrast for dark backgrounds
    colorBackground: '#242422',
    colorForeground: '#faf9f5',
    colorMuted: '#3d3d3a',
    colorMutedForeground: '#b0aea5',
    colorInput: '#141413',
    colorInputForeground: '#faf9f5',
    colorBorder: '#4d4c48',
    colorDanger: '#ef4444',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    borderRadius: '0.875rem',
    fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
  },
  elements: {
    rootBox: 'w-full max-w-[440px] mx-auto',
    cardBox: 'shadow-none border-0 bg-transparent w-full',
    card: 'bg-surface border border-border-soft shadow-2xl rounded-3xl overflow-hidden text-fg',
    main: 'p-6 sm:p-8 bg-transparent',
    headerTitle: 'font-serif text-2xl font-bold text-fg tracking-tight text-center',
    headerSubtitle: 'text-xs text-muted text-center mt-1 leading-relaxed',
    socialButtonsBlockButton: 'bg-surface-warm/80 hover:bg-surface-hover text-fg border border-border-soft hover:border-border rounded-xl py-3 px-4 transition-all cursor-pointer shadow-xs flex items-center justify-center relative w-full',
    socialButtonsBlockButtonText: 'text-fg font-medium text-sm',
    lastAuthenticationStrategyBadge: 'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30',
    dividerRow: 'my-5 flex items-center justify-center',
    dividerLine: 'bg-border-soft/80',
    dividerText: 'text-[10px] font-bold uppercase tracking-widest text-muted px-3',
    formFieldLabel: 'text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 block',
    formFieldInput: 'bg-bg border border-border-soft text-fg text-sm rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-muted/60 shadow-inner',
    formButtonPrimary: 'w-full bg-accent hover:bg-[#b5583b] text-accent-on font-semibold py-3 px-4 rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.99] cursor-pointer text-sm tracking-wide',
    footer: 'bg-transparent border-t border-border-soft/60 px-6 sm:px-8 py-4',
    footerAction: 'flex items-center justify-center',
    footerActionText: 'text-xs text-muted',
    footerActionLink: 'text-xs text-accent font-semibold hover:underline ml-1',
    identityPreviewText: 'text-sm font-medium text-fg',
    identityPreviewEditButton: 'text-accent text-xs hover:underline font-medium',
    formResendCodeLink: 'text-accent text-xs hover:underline font-medium',
    otpCodeFieldInput: 'border border-border-soft bg-bg text-fg rounded-xl text-lg font-bold focus:border-accent focus:ring-2 focus:ring-accent/20',
    userButtonPopoverCard: 'bg-surface border border-border-soft shadow-2xl rounded-2xl text-fg',
    userButtonPopoverActionButton: 'hover:bg-surface-hover text-fg transition-colors',
    userButtonPopoverActionButtonText: 'text-fg text-xs font-medium',
    userButtonPopoverFooter: 'hidden',
  },
};

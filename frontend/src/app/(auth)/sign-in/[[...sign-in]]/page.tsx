import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { theologicaClerkAppearance } from '@/lib/clerkTheme';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Theologica Scripture study workspace to sync notes, highlights, and inductive study canvases.',
};

export default function SignInPage() {
  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/"
      appearance={theologicaClerkAppearance}
    />
  );
}

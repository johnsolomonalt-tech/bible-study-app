import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { theologicaClerkAppearance } from '@/lib/clerkTheme';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a Theologica account to preserve your Scripture reading streak, interlinear highlights, and theological canvases.',
};

export default function SignUpPage() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/"
      appearance={theologicaClerkAppearance}
    />
  );
}

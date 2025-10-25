import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0a0a',
    }}>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-[#1a1a1a] border border-[#333]',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/onboarding"
      />
    </div>
  );
}

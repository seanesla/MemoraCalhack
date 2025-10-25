import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0a0a',
    }}>
      <SignUp
        appearance={{
          variables: {
            colorPrimary: '#FFB74D',
            colorBackground: '#0a0a0a',
            colorInputBackground: '#1a1a1a',
            colorInputText: '#FFFFFF',
            colorText: '#FFFFFF',
            colorTextSecondary: '#9a9a9a',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
          },
          elements: {
            rootBox: {
              width: '100%',
              maxWidth: '400px',
            },
            card: {
              backgroundColor: '#0a0a0a',
              border: '1px solid #333333',
              boxShadow: 'none',
            },
            headerTitle: {
              color: '#FFFFFF',
              fontSize: '32px',
              fontWeight: '700',
            },
            headerSubtitle: {
              color: '#9a9a9a',
            },
            socialButtonsBlockButton: {
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              color: '#FFFFFF',
            },
            socialButtonsBlockButton__google: {
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
            },
            dividerLine: {
              backgroundColor: '#333333',
            },
            dividerText: {
              color: '#9a9a9a',
            },
            formFieldLabel: {
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
            },
            formFieldInput: {
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              color: '#FFFFFF',
            },
            formButtonPrimary: {
              backgroundColor: '#FFB74D',
              color: '#000000',
              fontWeight: '600',
              fontSize: '16px',
              '&:hover': {
                backgroundColor: '#FFA726',
              },
            },
            footerActionLink: {
              color: '#FFB74D',
              '&:hover': {
                color: '#FFA726',
              },
            },
            identityPreviewText: {
              color: '#FFFFFF',
            },
            formResendCodeLink: {
              color: '#FFB74D',
            },
            otpCodeFieldInput: {
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              color: '#FFFFFF',
            },
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding"
      />
    </div>
  );
}

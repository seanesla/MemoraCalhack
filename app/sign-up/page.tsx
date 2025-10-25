'use client';

import Link from 'next/link';
import '../auth.css';

export default function SignUpPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // After sign-up, redirect to role selector
    window.location.href = '/sign-in';
  };

  return (
    <div className="authPage">
      <div className="authContainer">
        <Link href={"/memora-cinematic.html" as any} className="backLink">
          ← Back to Home
        </Link>

        <div className="authCard">
          <h1 className="authTitle">Sign Up</h1>
          <p className="authSubtitle">Create your Memora account</p>

          <form className="authForm" onSubmit={handleSubmit}>
            <div className="formField">
              <label htmlFor="name">FULL NAME</label>
              <input
                type="text"
                id="name"
                placeholder="John Smith"
                required
              />
            </div>

            <div className="formField">
              <label htmlFor="email">EMAIL</label>
              <input
                type="email"
                id="email"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="formField">
              <label htmlFor="password">PASSWORD</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="authButton">
              Create Account
            </button>
          </form>

          <p className="authFooter">
            Already have an account?{' '}
            <Link href="/sign-in" className="authLink">
              Sign in
            </Link>
          </p>

          <a href="/sign-in" className="skipButton">
            Skip for now →
          </a>
        </div>
      </div>
    </div>
  );
}

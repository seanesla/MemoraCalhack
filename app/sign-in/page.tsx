'use client';

import Link from 'next/link';
import '../auth.css';

export default function SignInPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = '/dashboard.html';
  };

  return (
    <div className="authPage">
      <div className="authContainer">
        <Link href="/memora-cinematic.html" className="backLink">
          ← Back to Home
        </Link>

        <div className="authCard">
          <h1 className="authTitle">Sign In</h1>
          <p className="authSubtitle">Welcome back to Memora</p>

          <form className="authForm" onSubmit={handleSubmit}>
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
              Sign In
            </button>
          </form>

          <p className="authFooter">
            Don't have an account?{' '}
            <Link href="/sign-up" className="authLink">
              Sign up
            </Link>
          </p>

          <a href="/dashboard.html" className="skipButton">
            Skip for now →
          </a>
        </div>
      </div>
    </div>
  );
}

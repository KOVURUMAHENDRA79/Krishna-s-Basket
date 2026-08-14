import React, { useEffect, useRef, useState } from 'react';
import './LoginDialog.css';

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
};

const getErrorMessage = (detail) => {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join(' ');
  }

  return 'Please check your details and try again.';
};

function LoginDialog({ isOpen, onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef(null);

  const isSignup = mode === 'signup';

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setStatusMessage('');
    window.setTimeout(() => emailInputRef.current?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.classList.add('login-dialog-open');
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('login-dialog-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const switchMode = () => {
    setMode((currentMode) => (currentMode === 'login' ? 'signup' : 'login'));
    setForm(emptyForm);
    setStatusMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage('');

    const endpoint = isSignup ? '/api/signup' : '/api/login';
    const payload = isSignup
      ? {
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      }
      : {
        email: form.email.trim(),
        password: form.password,
      };

    if (isSignup && !payload.full_name) {
      setStatusMessage('Please enter your name.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data.detail));
      }

      onAuthenticated(data);
      setForm(emptyForm);
      onClose();
    } catch (error) {
      setStatusMessage(error.message || 'The server could not be reached.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-dialog-backdrop" onMouseDown={onClose}>
      <section
        className="login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="login-dialog-close" type="button" onClick={onClose} aria-label="Close login dialog">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="login-dialog-copy">
          <p className="login-dialog-kicker">Krishna's Basket</p>
          <h2 id="login-dialog-title">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p>{isSignup ? 'Save your cart, wishlist, and orders in one place.' : 'Sign in to continue shopping.'}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="login-field">
              <span>Full name</span>
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </label>
          )}

          <label className="login-field">
            <span>Email</span>
            <input
              ref={emailInputRef}
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>

          {statusMessage && <p className="login-dialog-status">{statusMessage}</p>}

          <button className="login-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>

        <button className="login-mode-btn" type="button" onClick={switchMode}>
          {isSignup ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>
      </section>
    </div>
  );
}

export default LoginDialog;

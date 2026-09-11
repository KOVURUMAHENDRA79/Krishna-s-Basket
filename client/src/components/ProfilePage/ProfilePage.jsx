import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import LoginDialog from '../LoginDialog/LoginDialog';
import './ProfilePage.css';

const API_BASE = 'http://127.0.0.1:8000';

function ProfilePage() {
  const { user, login } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Personal information
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Security / password
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch the freshest profile from the database when the user changes.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }

    let cancelled = false;

    fetch(`${API_BASE}/api/users/${user.id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setFullName(data.full_name);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(user);
          setFullName(user.full_name);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed with status ${response.status}`);
      }
      const updated = await response.json();
      setProfile(updated);
      // Keep the header's "Hi, Name" and localStorage in sync.
      login(updated);
      setSaveMessage('Profile updated.');
    } catch (error) {
      setSaveError(error.message || 'Could not update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPassMessage('');
    setPassError('');

    if (passwords.new_password.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }

    if (passwords.new_password !== passwords.confirm_password) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed with status ${response.status}`);
      }
      setPassMessage('Password changed successfully.');
      setPasswords({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      setPassError(error.message || 'Could not change your password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <section className="profile-page">
        <div className="profile-empty">
          <h2 className="profile-empty-title">Login to view your profile</h2>
          <p className="profile-empty-sub">Your profile is tied to your account.</p>
          <button
            type="button"
            className="profile-empty-cta"
            onClick={() => setIsLoginOpen(true)}
          >
            Login
          </button>
        </div>

        <LoginDialog
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onAuthenticated={(authenticatedUser) => {
            login(authenticatedUser);
            setIsLoginOpen(false);
          }}
        />
      </section>
    );
  }

  return (
    <section className="profile-page">
      <h1 className="profile-title">My Profile</h1>

      <div className="profile-layout">
        <div className="profile-card">
          <h2 className="profile-section-title">Personal Information</h2>

          <form className="profile-form" onSubmit={handleSaveProfile}>
            <label className="profile-field">
              <span>Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                required
              />
            </label>

            <label className="profile-field">
              <span>Email</span>
              <input
                type="email"
                value={profile?.email || user.email}
                disabled
                title="Email cannot be changed yet"
              />
            </label>

            {saveMessage && <p className="profile-success">{saveMessage}</p>}
            {saveError && <p className="profile-error">{saveError}</p>}

            <button type="submit" className="profile-save-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="profile-card">
          <h2 className="profile-section-title">Account Information</h2>

          <div className="account-info">
            <div className="account-row">
              <span>Account ID</span>
              <span>#{user.id}</span>
            </div>
            <div className="account-row">
              <span>Email</span>
              <span>{profile?.email || user.email}</span>
            </div>
            <div className="account-row">
              <span>Member since</span>
              <span>—</span>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h2 className="profile-section-title">Security</h2>

          <form className="profile-form" onSubmit={handleChangePassword}>
            <label className="profile-field">
              <span>Current Password</span>
              <input
                type="password"
                name="current_password"
                autoComplete="current-password"
                value={passwords.current_password}
                onChange={handlePasswordChange}
                placeholder="Your current password"
                required
              />
            </label>

            <label className="profile-field">
              <span>New Password</span>
              <input
                type="password"
                name="new_password"
                autoComplete="new-password"
                value={passwords.new_password}
                onChange={handlePasswordChange}
                placeholder="At least 6 characters"
                required
              />
            </label>

            <label className="profile-field">
              <span>Confirm New Password</span>
              <input
                type="password"
                name="confirm_password"
                autoComplete="new-password"
                value={passwords.confirm_password}
                onChange={handlePasswordChange}
                placeholder="Repeat the new password"
                required
              />
            </label>

            {passMessage && <p className="profile-success">{passMessage}</p>}
            {passError && <p className="profile-error">{passError}</p>}

            <button type="submit" className="profile-save-btn" disabled={isChangingPassword}>
              {isChangingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;

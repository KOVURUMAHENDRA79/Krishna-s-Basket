import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import LoginDialog from '../LoginDialog/LoginDialog';
import AddressForm from '../AddressForm/AddressForm';
import './AddressesPage.css';

const API_BASE = 'http://127.0.0.1:8000';

const labelNames = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

function AddressesPage() {
  const { user, login } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const loadAddresses = () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(false);

    fetch(`${API_BASE}/api/users/${user.id}/addresses`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => setAddresses(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  // Reload whenever the logged-in user changes (new user → new addresses).
  useEffect(() => {
    setAddresses([]);
    setShowAddForm(false);
    setEditingId(null);
    loadAddresses();
  }, [user?.id]);

  const handleCreate = async (values) => {
    const response = await fetch(`${API_BASE}/api/users/${user.id}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    loadAddresses();
    setShowAddForm(false);
  };

  const handleUpdate = async (addressId, values) => {
    const response = await fetch(
      `${API_BASE}/api/users/${user.id}/addresses/${addressId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    loadAddresses();
    setEditingId(null);
  };

  const handleSetDefault = async (addressId) => {
    const response = await fetch(
      `${API_BASE}/api/users/${user.id}/addresses/${addressId}/default`,
      { method: 'PUT' }
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    loadAddresses();
  };

  const handleDelete = async (addressId) => {
    const response = await fetch(
      `${API_BASE}/api/users/${user.id}/addresses/${addressId}`,
      { method: 'DELETE' }
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    loadAddresses();
  };

  if (!user) {
    return (
      <section className="addresses-page">
        <div className="addresses-empty">
          <h2 className="addresses-empty-title">Login to see your addresses</h2>
          <p className="addresses-empty-sub">Your saved addresses belong to your account.</p>
          <button
            type="button"
            className="addresses-empty-cta"
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
    <section className="addresses-page">
      <h1 className="addresses-title">My Addresses</h1>

      {loading && <p className="addresses-note">Loading your addresses...</p>}

      {!loading && error && (
        <p className="addresses-note">Unable to load addresses. Please try again.</p>
      )}

      {!loading && !error && addresses.length === 0 && (
        <p className="addresses-note">
          You haven't saved any addresses yet. Add one below — it will be used
          automatically at checkout.
        </p>
      )}

      <div className="addresses-list">
        {addresses.map((address) => (
          <article key={address.id} className="address-card">
            <div className="address-card-header">
              <span className="address-card-label">
                {labelNames[address.label] || address.label}
              </span>
              {address.is_default && (
                <span className="address-default-badge">★ Default</span>
              )}
            </div>

            <p className="address-card-name">{address.full_name}</p>
            <p className="address-card-line">{address.address_line}</p>
            <p className="address-card-line">
              {address.city}, {address.state} — {address.pincode}
            </p>
            <p className="address-card-line">Phone: {address.phone}</p>

            <div className="address-actions">
              {!address.is_default && (
                <button
                  type="button"
                  className="address-action"
                  onClick={() => handleSetDefault(address.id)}
                >
                  Set as Default
                </button>
              )}
              <button
                type="button"
                className="address-action"
                onClick={() => {
                  setEditingId(address.id);
                  setShowAddForm(false);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="address-action address-action-danger"
                onClick={() => handleDelete(address.id)}
              >
                Delete
              </button>
            </div>

            {editingId === address.id && (
              <div className="address-form-wrap">
                <AddressForm
                  initialValues={address}
                  submitLabel="Update Address"
                  onSubmit={(values) => handleUpdate(address.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </article>
        ))}
      </div>

      {showAddForm && (
        <div className="address-form-wrap">
          <AddressForm
            submitLabel="Save Address"
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {!showAddForm && (
        <button
          type="button"
          className="addresses-add-btn"
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
        >
          + Add New Address
        </button>
      )}
    </section>
  );
}

export default AddressesPage;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useCart } from '../../context/useCart';
import LoginDialog from '../LoginDialog/LoginDialog';
import AddressForm from '../AddressForm/AddressForm';
import './CheckoutPage.css';

const API_BASE = 'http://127.0.0.1:8000';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e2e8f0"/><text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">Image unavailable</text></svg>`
  );

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const emptyDelivery = {
  full_name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const labelNames = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

function CheckoutPage() {
  const { user, login } = useAuth();
  const { cartItems, cartLoading, subtotal } = useCart();
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Saved addresses (Address Management system)
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Manual-form fallback (only used when the user has no saved addresses)
  const [delivery, setDelivery] = useState(emptyDelivery);

  // Load the user's saved addresses; the default one (or the first one)
  // becomes the initially selected delivery address.
  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      setSelectedAddressId(null);
      return undefined;
    }

    let cancelled = false;
    setAddressesLoading(true);

    fetch(`${API_BASE}/api/users/${user.id}/addresses`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setSavedAddresses(data);
          const defaultAddress = data.find((address) => address.is_default) || data[0];
          setSelectedAddressId(defaultAddress ? defaultAddress.id : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSavedAddresses([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAddressesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Pre-fill the manual form's full name from the profile (fallback path).
  useEffect(() => {
    if (user?.full_name) {
      setDelivery((current) => ({ ...current, full_name: user.full_name }));
    }
  }, [user?.full_name]);

  const handleDeliveryChange = (event) => {
    const { name, value } = event.target;
    setDelivery((current) => ({ ...current, [name]: value }));
  };

  const handleAuthenticated = (authenticatedUser) => {
    login(authenticatedUser);
    setIsLoginOpen(false);
  };

  const selectedAddress =
    savedAddresses.find((address) => address.id === selectedAddressId) || null;

  // The payload we hand to /payment, matching the backend ShippingAddress
  // schema: a saved address is mapped (address_line → address), otherwise
  // the manual form is used.
  const orderDelivery = selectedAddress
    ? {
        full_name: selectedAddress.full_name,
        phone: selectedAddress.phone,
        address: selectedAddress.address_line,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      }
    : delivery;

  const handleAddFromCheckout = async (values) => {
    const response = await fetch(`${API_BASE}/api/users/${user.id}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const created = await response.json();
    // Available immediately: select the new address for this order.
    setSavedAddresses((current) => [...current, created]);
    setSelectedAddressId(created.id);
    setIsAddingAddress(false);
    setIsPickerOpen(false);
  };

  const shipping = 0;
  const total = subtotal + shipping;

  if (cartLoading) {
    return (
      <section className="checkout-page">
        <div className="checkout-empty">
          <p className="checkout-empty-sub">Loading your cart...</p>
        </div>
      </section>
    );
  }

  // Gate 1: checkout requires a logged-in user.
  if (!user) {
    return (
      <section className="checkout-page">
        <div className="checkout-empty">
          <h2 className="checkout-empty-title">Login to checkout</h2>
          <p className="checkout-empty-sub">
            Your cart is saved to your account. Log in to continue with your order.
          </p>
          <button
            type="button"
            className="checkout-empty-cta"
            onClick={() => setIsLoginOpen(true)}
          >
            Login
          </button>
          <Link to="/cart" className="checkout-secondary-link">Back to cart</Link>
        </div>

        <LoginDialog
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      </section>
    );
  }

  // Gate 2: nothing to check out with an empty cart.
  if (cartItems.length === 0) {
    return (
      <section className="checkout-page">
        <div className="checkout-empty">
          <h2 className="checkout-empty-title">Your cart is empty</h2>
          <p className="checkout-empty-sub">
            Add some products before checking out.
          </p>
          <Link to="/" className="checkout-empty-cta">Continue Shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <h1 className="checkout-title">Checkout</h1>

      <div className="checkout-layout">
        <div className="checkout-form">
          <h2 className="checkout-section-title">Delivery Information</h2>

          {addressesLoading ? (
            <p className="checkout-empty-sub">Loading your addresses...</p>
          ) : savedAddresses.length > 0 ? (
            <>
              <div className="selected-address">
                <div className="selected-address-top">
                  <span className="selected-address-label">
                    {labelNames[selectedAddress.label] || selectedAddress.label}
                  </span>
                  {selectedAddress.is_default && (
                    <span className="selected-address-default">★ Default</span>
                  )}
                </div>

                <p className="selected-address-name">{selectedAddress.full_name}</p>
                <p className="selected-address-line">{selectedAddress.address_line}</p>
                <p className="selected-address-line">
                  {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}
                </p>
                <p className="selected-address-line">Phone: {selectedAddress.phone}</p>

                <button
                  type="button"
                  className="change-address-btn"
                  onClick={() => {
                    setIsPickerOpen((open) => !open);
                    setIsAddingAddress(false);
                  }}
                >
                  {isPickerOpen ? 'Close' : 'Change Address'}
                </button>
              </div>

              {isPickerOpen && (
                <div className="address-picker">
                  {!isAddingAddress && (
                    <>
                      <h3 className="picker-title">Select Delivery Address</h3>
                      {savedAddresses.map((address) => (
                        <label
                          key={address.id}
                          className={`address-option ${address.id === selectedAddressId ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="pick-address"
                            checked={address.id === selectedAddressId}
                            onChange={() => setSelectedAddressId(address.id)}
                          />
                          <span className="address-option-body">
                            <span className="address-option-label">
                              {labelNames[address.label] || address.label}
                              {address.is_default && <span className="address-option-default">★ Default</span>}
                            </span>
                            <span className="address-option-text">{address.address_line}</span>
                            <span className="address-option-text">
                              {address.city}, {address.state} — {address.pincode}
                            </span>
                          </span>
                        </label>
                      ))}

                      <button
                        type="button"
                        className="use-address-btn"
                        onClick={() => setIsPickerOpen(false)}
                      >
                        Use This Address
                      </button>

                      <button
                        type="button"
                        className="picker-add-btn"
                        onClick={() => setIsAddingAddress(true)}
                      >
                        + Add New Address
                      </button>
                    </>
                  )}

                  {isAddingAddress && (
                    <AddressForm
                      submitLabel="Save Address"
                      onSubmit={handleAddFromCheckout}
                      onCancel={() => setIsAddingAddress(false)}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <form
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="form-grid">
                <label className="form-field form-field-full">
                  <span>Full Name</span>
                  <input
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    value={delivery.full_name}
                    onChange={handleDeliveryChange}
                    placeholder="Your full name"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Phone Number</span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={delivery.phone}
                    onChange={handleDeliveryChange}
                    placeholder="10-digit mobile number"
                    required
                  />
                </label>

                <label className="form-field form-field-full">
                  <span>Address</span>
                  <input
                    name="address"
                    type="text"
                    autoComplete="street-address"
                    value={delivery.address}
                    onChange={handleDeliveryChange}
                    placeholder="House no, street, area"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>City</span>
                  <input
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    value={delivery.city}
                    onChange={handleDeliveryChange}
                    placeholder="Your city"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>State</span>
                  <input
                    name="state"
                    type="text"
                    autoComplete="address-level1"
                    value={delivery.state}
                    onChange={handleDeliveryChange}
                    placeholder="Your state"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Pincode</span>
                  <input
                    name="pincode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={delivery.pincode}
                    onChange={handleDeliveryChange}
                    placeholder="6-digit pincode"
                    required
                  />
                </label>
              </div>
            </form>
          )}
        </div>

        <aside className="checkout-summary">
          <h2 className="checkout-section-title">Order Summary</h2>

          <ul className="summary-items">
            {cartItems.map((item) => (
              <li key={item.productId} className="summary-item">
                <img
                  src={item.image_url || FALLBACK_IMAGE}
                  alt={item.name}
                  className="summary-item-image"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                <div className="summary-item-info">
                  <p className="summary-item-name">{item.name}</p>
                  <p className="summary-item-meta">
                    {formatPrice(item.price)} × {item.quantity}
                  </p>
                </div>
                <span className="summary-item-total">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="summary-lines">
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Shipping</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="summary-line summary-line-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <button
            type="button"
            className="proceed-btn"
            onClick={() => navigate('/payment', { state: { delivery: orderDelivery } })}
          >
            Proceed to Payment
          </button>
          <p className="proceed-note">
            You'll be redirected to a demo payment page.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default CheckoutPage;

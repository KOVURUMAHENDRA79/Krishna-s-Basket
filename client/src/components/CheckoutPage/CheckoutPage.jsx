import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useCart } from '../../context/useCart';
import LoginDialog from '../LoginDialog/LoginDialog';
import './CheckoutPage.css';

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
  fullName: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

function CheckoutPage() {
  const { user, login } = useAuth();
  const { cartItems, cartLoading, subtotal } = useCart();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [delivery, setDelivery] = useState(emptyDelivery);

  // Pre-fill the full name from the logged-in user's profile.
  useEffect(() => {
    if (user?.full_name) {
      setDelivery((current) => ({ ...current, fullName: user.full_name }));
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
        <form
          className="checkout-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <h2 className="checkout-section-title">Delivery Information</h2>

          <div className="form-grid">
            <label className="form-field form-field-full">
              <span>Full Name</span>
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                value={delivery.fullName}
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

          <button type="button" className="proceed-btn">
            Proceed to Payment
          </button>
          <p className="proceed-note">Payment comes in the next layer.</p>
        </aside>
      </div>
    </section>
  );
}

export default CheckoutPage;

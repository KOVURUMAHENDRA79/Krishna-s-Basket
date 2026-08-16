import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import { useAuth } from '../../context/useAuth';
import './CartPage.css';

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

function CartPage() {
  const { cartItems, cartLoading, removeFromCart, updateQuantity, clearCart, subtotal } = useCart();
  const { user } = useAuth();

  if (cartLoading) {
    return (
      <section className="cart-page">
        <div className="cart-empty">
          <p className="cart-empty-sub">Loading your cart...</p>
        </div>
      </section>
    );
  }

  if (cartItems.length === 0) {
    return (
      <section className="cart-page">
        <div className="cart-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          <h2 className="cart-empty-title">
            {user ? 'Your cart is empty' : 'Login to see your cart'}
          </h2>
          <p className="cart-empty-sub">
            {user
              ? 'Add some products to get started.'
              : 'Your cart is saved to your account. Log in to view and manage it.'}
          </p>
          <Link to="/" className="cart-empty-cta">Start Shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <h1 className="cart-title">Shopping Cart</h1>

      <div className="cart-layout">
        <div className="cart-items">
          {cartItems.map((item) => (
            <div key={item.productId} className="cart-item">
              <Link to={`/product/${item.productId}`} className="cart-item-link">
                <img
                  src={item.image_url || FALLBACK_IMAGE}
                  alt={item.name}
                  className="cart-item-image"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                <div className="cart-item-info">
                  <h3 className="cart-item-name">{item.name}</h3>
                  <span className="cart-item-price">{formatPrice(item.price)}</span>
                </div>
              </Link>

              <div className="cart-item-controls">
                <div className="qty-controls">
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >−</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >+</button>
                </div>

                <span className="cart-item-total">{formatPrice(item.price * item.quantity)}</span>

                <button
                  className="cart-remove-btn"
                  onClick={() => removeFromCart(item.productId)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button className="cart-clear-btn" onClick={clearCart}>
            Clear Cart
          </button>
        </div>

        <aside className="cart-summary">
          <h2 className="summary-title">Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <Link to="/checkout" className="checkout-btn">Checkout</Link>
        </aside>
      </div>
    </section>
  );
}

export default CartPage;

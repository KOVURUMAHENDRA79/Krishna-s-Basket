import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useCart } from '../../context/useCart';
import LoginDialog from '../LoginDialog/LoginDialog';
import './PaymentPage.css';

const API_BASE = 'http://127.0.0.1:8000';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function PaymentPage() {
  const { user, login } = useAuth();
  const { cartItems, cartLoading, subtotal, clearCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // The delivery details the user typed on /checkout, passed via router state.
  const delivery = location.state?.delivery || null;

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [method, setMethod] = useState('upi');
  // idle → processing → success | failed | error
  const [phase, setPhase] = useState('idle');
  const [order, setOrder] = useState(null);
  const [payMessage, setPayMessage] = useState('');

  const shipping = 0;
  const total = subtotal + shipping;

  function simulatePaymentThenOrder() {
    setPhase('processing');
    setPayMessage('');

    // Simulated gateway: ~1.8s "processing", then random outcome.
    window.setTimeout(() => {
      if (Math.random() < 0.75) {
        placeOrder();
      } else {
        setPhase('failed');
        setPayMessage('Your payment could not be completed. No order was created.');
      }
    }, 1800);
  }

  async function placeOrder() {
    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: delivery,
          payment_method: method,
          payment_status: 'paid',
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const createdOrder = await response.json();
      setOrder(createdOrder);
      setPhase('success');
      // The server already emptied the cart; sync the client state.
      await clearCart();
    } catch {
      setPhase('error');
      setPayMessage('The payment succeeded, but your order could not be placed. Please try again.');
    }
  }

  function retry() {
    if (phase === 'error') {
      placeOrder();
    } else {
      simulatePaymentThenOrder();
    }
  }

  const handleAuthenticated = (authenticatedUser) => {
    login(authenticatedUser);
    setIsLoginOpen(false);
  };

  if (cartLoading) {
    return (
      <section className="payment-page">
        <div className="payment-empty">
          <p className="payment-empty-sub">Loading your cart...</p>
        </div>
      </section>
    );
  }

  // Gate 0: order confirmed (must come before the empty-cart check, because
  // placing the order empties the cart by design).
  if (phase === 'success' && order) {
    return (
      <section className="payment-page">
        <div className="payment-result payment-result-success">
          <div className="result-icon">✓</div>
          <h2 className="payment-result-title">Payment Successful</h2>
          <p className="payment-result-sub">
            Order <strong>#{order.id}</strong> is confirmed. A confirmation email will be sent to {user.email}.
          </p>

          <div className="result-card">
            <div className="result-row">
              <span>Order ID</span>
              <span>#{order.id}</span>
            </div>
            <div className="result-row">
              <span>Amount Paid</span>
              <span>{formatPrice(order.total_amount)}</span>
            </div>
            <div className="result-row">
              <span>Payment Method</span>
              <span>{order.payment_method === 'upi' ? 'Demo UPI' : 'Demo Card'}</span>
            </div>
            <div className="result-row">
              <span>Estimated Delivery</span>
              <span>{order.estimated_delivery}</span>
            </div>
            <div className="result-row">
              <span>Status</span>
              <span className="result-status-badge">Confirmed</span>
            </div>
          </div>

          <Link to="/" className="payment-empty-cta">Continue Shopping</Link>
        </div>
      </section>
    );
  }

  // Gate 1: checkout requires a logged-in user.
  if (!user) {
    return (
      <section className="payment-page">
        <div className="payment-empty">
          <h2 className="payment-empty-title">Login to pay</h2>
          <p className="payment-empty-sub">Sign in to complete your purchase.</p>
          <button type="button" className="payment-empty-cta" onClick={() => setIsLoginOpen(true)}>
            Login
          </button>
        </div>

        <LoginDialog
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      </section>
    );
  }

  // Gate 2: we need the delivery details that /checkout collected.
  if (!delivery) {
    return (
      <section className="payment-page">
        <div className="payment-empty">
          <h2 className="payment-empty-title">Missing delivery details</h2>
          <p className="payment-empty-sub">Please fill in your delivery information first.</p>
          <Link to="/checkout" className="payment-empty-cta">Back to Checkout</Link>
        </div>
      </section>
    );
  }

  // Gate 3: nothing to pay for with an empty cart.
  if (cartItems.length === 0) {
    return (
      <section className="payment-page">
        <div className="payment-empty">
          <h2 className="payment-empty-title">Your cart is empty</h2>
          <p className="payment-empty-sub">Add some products before checking out.</p>
          <Link to="/" className="payment-empty-cta">Continue Shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="payment-page">
      <div className="payment-card">
        <h1 className="payment-title">Demo Payment</h1>

        <div className="payment-amount">
          <span className="payment-amount-label">Order Amount</span>
          <span className="payment-amount-value">{formatPrice(total)}</span>
        </div>

        {phase === 'processing' ? (
          <div className="payment-processing">
            <div className="payment-spinner" aria-hidden="true" />
            <p className="payment-processing-text">Processing payment...</p>
            <p className="payment-processing-sub">This is a simulated gateway — no real money moves.</p>
          </div>
        ) : (
          <>
            <fieldset className="payment-methods">
              <legend>Choose a payment method</legend>

              <label className={`payment-method ${method === 'upi' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="method"
                  value="upi"
                  checked={method === 'upi'}
                  onChange={() => setMethod('upi')}
                  disabled={phase === 'processing'}
                />
                <span className="payment-method-name">Demo UPI</span>
                <span className="payment-method-note">Instant &amp; free</span>
              </label>

              <label className={`payment-method ${method === 'card' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="method"
                  value="card"
                  checked={method === 'card'}
                  onChange={() => setMethod('card')}
                  disabled={phase === 'processing'}
                />
                <span className="payment-method-name">Demo Card</span>
                <span className="payment-method-note">No real card details stored</span>
              </label>
            </fieldset>

            {(phase === 'failed' || phase === 'error') && (
              <div className={`payment-message payment-message-${phase}`}>
                <strong>{phase === 'failed' ? 'Payment Failed ✗' : 'Order Not Placed'}</strong>
                <p>{payMessage} Your cart is safe.</p>
              </div>
            )}

            <button
              type="button"
              className="pay-btn"
              onClick={phase === 'idle' ? simulatePaymentThenOrder : retry}
            >
              {phase === 'idle' ? `Pay ${formatPrice(total)}` : 'Try Again'}
            </button>

            <button
              type="button"
              className="payment-cancel"
              onClick={() => navigate('/checkout')}
            >
              Cancel — back to checkout
            </button>

            <p className="payment-note">
              Demo gateway only. Never enter real card numbers, CVV, or PINs anywhere on this site.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default PaymentPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import LoginDialog from '../LoginDialog/LoginDialog';
import './OrdersPage.css';

const API_BASE = 'http://127.0.0.1:8000';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function OrdersPage() {
  const { user, login } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Fetch THIS user's orders whenever the logged-in user changes.
  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`${API_BASE}/api/users/${user.id}/orders`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return (
      <section className="orders-page">
        <div className="orders-empty">
          <h2 className="orders-empty-title">Login to see your orders</h2>
          <p className="orders-empty-sub">
            Your orders are saved to your account.
          </p>
          <button
            type="button"
            className="orders-empty-cta"
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

  if (loading) {
    return (
      <section className="orders-page">
        <div className="orders-empty">
          <p className="orders-empty-sub">Loading your orders...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="orders-page">
        <div className="orders-empty">
          <h2 className="orders-empty-title">Unable to load orders</h2>
          <p className="orders-empty-sub">Please try again in a moment.</p>
        </div>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="orders-page">
        <div className="orders-empty">
          <h2 className="orders-empty-title">No orders yet</h2>
          <p className="orders-empty-sub">
            When you complete a checkout, your orders will appear here.
          </p>
          <Link to="/" className="orders-empty-cta">Start Shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="orders-page">
      <h1 className="orders-title">My Orders</h1>

      <div className="orders-list">
        {orders.map((order) => (
          <article key={order.id} className="order-card">
            <header className="order-card-header">
              <div className="order-card-id">
                <span className="order-label">Order</span>
                <span className="order-id">#{order.id}</span>
              </div>

              <div className="order-card-meta">
                <span className="order-date">{formatDate(order.created_at)}</span>
                <span className={`order-badge order-badge-${order.status}`}>
                  {order.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                </span>
                <span className={`order-badge order-badge-pay-${order.payment_status}`}>
                  {order.payment_status === 'paid' ? 'Paid' : 'Payment pending'}
                </span>
              </div>
            </header>

            <ul className="order-items">
              {order.items.map((item) => (
                <li key={item.id} className="order-item">
                  <div className="order-item-info">
                    <span className="order-item-name">{item.product.name}</span>
                    <span className="order-item-meta">
                      {formatPrice(item.price)} × {item.quantity}
                    </span>
                  </div>
                  <span className="order-item-total">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <footer className="order-card-footer">
              <div className="order-delivery">
                <span className="order-label">Delivery to</span>
                <span className="order-delivery-text">
                  {order.shipping_address.full_name}, {order.shipping_address.city},{' '}
                  {order.shipping_address.state} — {order.shipping_address.pincode}
                </span>
                <span className="order-label">Estimated delivery</span>
                <span className="order-delivery-text">{order.estimated_delivery}</span>
              </div>

              <div className="order-total">
                <span className="order-label">Total</span>
                <span className="order-total-value">{formatPrice(order.total_amount)}</span>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

export default OrdersPage;
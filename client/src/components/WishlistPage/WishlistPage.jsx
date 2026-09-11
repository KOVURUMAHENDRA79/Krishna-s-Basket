import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useWishlist } from '../../context/useWishlist';
import { useCart } from '../../context/useCart';
import LoginDialog from '../LoginDialog/LoginDialog';
import './WishlistPage.css';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e2e8f0"/><text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="24" text-anchor="middle" dominant-baseline="middle">Image unavailable</text></svg>`
  );

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function renderStars(rating) {
  const fullStars = Math.round(rating);
  return (
    <span className="wishlist-stars" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(fullStars)}
      {'☆'.repeat(5 - fullStars)}
    </span>
  );
}

function WishlistPage() {
  const { user, login } = useAuth();
  const { wishlist, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  if (!user) {
    return (
      <section className="wishlist-page">
        <div className="wishlist-empty">
          <h2 className="wishlist-empty-title">Login to see your wishlist</h2>
          <p className="wishlist-empty-sub">Your wishlist is saved to your account.</p>
          <button
            type="button"
            className="wishlist-empty-cta"
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
      <section className="wishlist-page">
        <div className="wishlist-empty">
          <p className="wishlist-empty-sub">Loading your wishlist...</p>
        </div>
      </section>
    );
  }

  if (wishlist.length === 0) {
    return (
      <section className="wishlist-page">
        <div className="wishlist-empty">
          <span className="wishlist-empty-heart" aria-hidden="true">♡</span>
          <h2 className="wishlist-empty-title">Your Wishlist is Empty</h2>
          <p className="wishlist-empty-sub">
            Save products you love and come back to them later.
          </p>
          <Link to="/" className="wishlist-empty-cta">Continue Shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="wishlist-page">
      <div className="wishlist-header">
        <h1 className="wishlist-title">My Wishlist</h1>
        <span className="wishlist-count">
          {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="wishlist-list">
        {wishlist.map((item) => (
          <article key={item.product_id} className="wishlist-item">
            <Link
              to={`/product/${item.product_id}`}
              className="wishlist-item-image-link"
            >
              <img
                src={item.image_url || FALLBACK_IMAGE}
                alt={item.name}
                className="wishlist-item-image"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
            </Link>

            <div className="wishlist-item-info">
              <Link to={`/product/${item.product_id}`} className="wishlist-item-name">
                {item.name}
              </Link>

              <div className="wishlist-item-rating">
                {renderStars(item.rating)}
                <span className="wishlist-review-count">({item.review_count})</span>
              </div>

              <div className="wishlist-item-price-row">
                <span className="wishlist-item-price">{formatPrice(item.price)}</span>
                {item.original_price && (
                  <span className="wishlist-item-original">{formatPrice(item.original_price)}</span>
                )}
              </div>

              <span className={`wishlist-item-stock ${item.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                {item.stock > 0 ? `In Stock (${item.stock} available)` : 'Out of Stock'}
              </span>

              <div className="wishlist-item-actions">
                <button
                  type="button"
                  className="wishlist-add-cart"
                  disabled={item.stock === 0}
                  onClick={() =>
                    addToCart({
                      id: item.product_id,
                      name: item.name,
                      price: item.price,
                      image_url: item.image_url,
                    })
                  }
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  className="wishlist-remove"
                  onClick={() => removeFromWishlist(item.product_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WishlistPage;

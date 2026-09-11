import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useWishlist } from '../../context/useWishlist';
import LoginDialog from '../LoginDialog/LoginDialog';
import './WishlistHeart.css';

function WishlistHeart({ productId, variant = 'overlay' }) {
  const { user, login } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const wishlisted = isWishlisted(productId);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      // Not logged in → open the existing login dialog, never silently ignore.
      setIsLoginOpen(true);
      return;
    }

    await toggleWishlist(productId);
  };

  return (
    <>
      <button
        type="button"
        className={`wishlist-heart wishlist-heart--${variant} ${wishlisted ? 'wishlist-heart--active' : ''}`}
        onClick={handleClick}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wishlisted}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={wishlisted ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      </button>

      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onAuthenticated={(authenticatedUser) => {
          login(authenticatedUser);
          setIsLoginOpen(false);
        }}
      />
    </>
  );
}

export default WishlistHeart;

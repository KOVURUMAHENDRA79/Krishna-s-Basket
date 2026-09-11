import React, { useEffect, useState } from 'react';
import { WishlistContext } from './wishlist-context';
import { useAuth } from './useAuth';

const API_BASE = 'http://127.0.0.1:8000';

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id;

  // Load THIS user's wishlist whenever the user changes.
  useEffect(() => {
    if (!userId) {
      setWishlist([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${API_BASE}/api/users/${userId}/wishlist`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setWishlist(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWishlist([]);
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
  }, [userId]);

  function isWishlisted(productId) {
    return wishlist.some((item) => item.product_id === productId);
  }

  async function addToWishlist(productId) {
    if (!userId) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const item = await response.json();
      setWishlist((current) => [...current, item]);
      return true;
    } catch {
      return false;
    }
  }

  async function removeFromWishlist(productId) {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/users/${userId}/wishlist/${productId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const remaining = await response.json();
      setWishlist(remaining);
    } catch {
      // keep the current list; a later refresh fixes it
    }
  }

  async function toggleWishlist(productId) {
    if (isWishlisted(productId)) {
      await removeFromWishlist(productId);
      return false;
    }
    return addToWishlist(productId);
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        isWishlisted,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

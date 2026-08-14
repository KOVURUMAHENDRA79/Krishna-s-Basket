import React, { useEffect, useRef, useState } from 'react';
import { CartContext } from './cart-context';
import { useAuth } from './useAuth';

const API_BASE = 'http://127.0.0.1:8000';

function toCartItems(data) {
  return data.map((item) => ({
    productId: item.product_id,
    name: item.product.name,
    price: item.product.price,
    image_url: item.product.image_url || null,
    quantity: item.quantity,
  }));
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeTimerRef = useRef(null);

  const userId = user?.id;

  // Load THIS user's cart from the database whenever the user changes.
  useEffect(() => {
    if (!userId) {
      setCartItems([]);
      return undefined;
    }

    let cancelled = false;
    setCartLoading(true);

    fetch(`${API_BASE}/api/users/${userId}/cart`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCartItems(toCartItems(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCartItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCartLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function showNotice(message) {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 2500);
  }

  async function addToCart(product) {
    if (!userId) {
      showNotice('Login to add to cart');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      setCartItems(toCartItems(data));
      return true;
    } catch {
      showNotice('Could not update your cart.');
      return false;
    }
  }

  async function removeFromCart(productId) {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/users/${userId}/cart/${productId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      setCartItems(toCartItems(data));
    } catch {
      showNotice('Could not update your cart.');
    }
  }

  async function updateQuantity(productId, quantity) {
    if (!userId) {
      return;
    }

    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/users/${userId}/cart/${productId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        }
      );
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      setCartItems(toCartItems(data));
    } catch {
      showNotice('Could not update your cart.');
    }
  }

  async function clearCart() {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/cart`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      setCartItems([]);
    } catch {
      showNotice('Could not clear your cart.');
    }
  }

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
      {notice && <div className="cart-toast" role="status">{notice}</div>}
    </CartContext.Provider>
  );
}
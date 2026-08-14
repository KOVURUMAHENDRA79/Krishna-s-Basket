import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import LoginDialog from '../LoginDialog/LoginDialog';
import { useCart } from '../../context/useCart';
import { useAuth } from '../../context/useAuth';

function Header() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const authMenuRef = useRef(null);
  const { itemCount } = useCart();
  const { user: currentUser, login, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = currentUser?.full_name?.split(' ')[0] || 'Account';

  useEffect(() => {
    if (!isAuthMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!authMenuRef.current?.contains(event.target)) {
        setIsAuthMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAuthMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthMenuOpen]);

  const openLoginDialog = () => {
    setIsAuthMenuOpen(false);
    setIsLoginOpen(true);
  };

  const closeLoginDialog = () => {
    setIsLoginOpen(false);
  };

  const handleAuthenticated = (user) => {
    login(user);
    setIsAuthMenuOpen(false);
  };

  const handleSignOut = () => {
    logout();
    setIsAuthMenuOpen(false);
  };

  const handleAuthButtonClick = () => {
    if (currentUser) {
      setIsAuthMenuOpen((isOpen) => !isOpen);
      return;
    }

    openLoginDialog();
  };

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <span className="logo-accent">Krishna's</span> Basket
        </div>

        <form
          className="search-container"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const query = searchQuery.trim();
            if (query) {
              navigate(`/search?q=${encodeURIComponent(query)}`);
            }
          }}
        >
          <input
            type="text"
            placeholder="Try 'comfortable summer shirt'..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
          <button className="search-btn" type="submit" aria-label="Search">
            {/* SVG code for a Magnifying Glass Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </form>

        <div className="header-actions">
          {/* Our new Login Button */}
          <div className="auth-menu-container" ref={authMenuRef}>
            <button
              className="auth-btn"
              type="button"
              onClick={handleAuthButtonClick}
              aria-haspopup={currentUser ? 'menu' : undefined}
              aria-expanded={currentUser ? isAuthMenuOpen : undefined}
            >
              {currentUser ? `Hi, ${displayName}` : 'Login'}
            </button>

            {currentUser && isAuthMenuOpen && (
              <div className="auth-menu" role="menu">
                <p className="auth-menu-name">{currentUser.full_name}</p>
                <p className="auth-menu-email">{currentUser.email}</p>
                <button className="auth-menu-signout" type="button" role="menuitem" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* The Account icon now acts as a Dropdown invisible container */}
          <div className="dropdown-container">
            <button className="icon-box-btn" type="button" aria-label="Account">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* The Hidden Dropdown Menu */}
            <div className="dropdown-menu">
              <a href="#profile" className="dropdown-item">My Profile</a>
              <a href="#orders" className="dropdown-item">Orders</a>
              <a href="#wishlist" className="dropdown-item">Wishlist</a>
              <a href="#help" className="dropdown-item">Help Center</a>
              {currentUser ? (
                <button className="dropdown-item dropdown-item-button" type="button" onClick={handleSignOut}>
                  Sign out
                </button>
              ) : (
                <button className="dropdown-item dropdown-item-button" type="button" onClick={openLoginDialog}>
                  Log in
                </button>
              )}
            </div>
          </div>

          <Link to="/cart" className="icon-box-btn cart-btn" aria-label={`Cart, ${itemCount} items`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            {itemCount > 0 && (
              <span className="cart-badge">{itemCount > 99 ? '99+' : itemCount}</span>
            )}
          </Link>
        </div>
      </header>

      <LoginDialog
        isOpen={isLoginOpen}
        onClose={closeLoginDialog}
        onAuthenticated={handleAuthenticated}
      />
    </>
  );
}

export default Header;

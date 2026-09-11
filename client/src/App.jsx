import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import CategoryNav from './components/CategoryNav/CategoryNav';
import HeroBanner from './components/HeroBanner/HeroBanner'; 
import ProductCarousel from './components/ProductCarousel/ProductCarousel';
import CategoryProducts from './components/CategoryProducts/CategoryProducts';
import ProductDetails from './components/ProductDetails/ProductDetails';
import CartPage from './components/CartPage/CartPage';
import CheckoutPage from './components/CheckoutPage/CheckoutPage';
import PaymentPage from './components/PaymentPage/PaymentPage';
import OrdersPage from './components/OrdersPage/OrdersPage';
import AddressesPage from './components/AddressesPage/AddressesPage';
import ProfilePage from './components/ProfilePage/ProfilePage';
import SearchResults from './components/SearchResults/SearchResults';
import WishlistPage from './components/WishlistPage/WishlistPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
        <div className="app-layout">
          <Header />
          
          <main className="main-content">
            
            {/* Navigation Categories Row */}
            <CategoryNav />

            <Routes>
              <Route path="/" element={<>
                {/* Section 1: Hero Banner */}
                <HeroBanner />

                {/* Section 2: Recommendations Row */}
                <ProductCarousel />
              </>} />

              {/* Category Product Listing */}
              <Route path="/category/:categorySlug" element={<CategoryProducts />} />

              {/* Product Details */}
              <Route path="/product/:productId" element={<ProductDetails />} />

              {/* Search Results */}
              <Route path="/search" element={<SearchResults />} />

              {/* Cart */}
              <Route path="/cart" element={<CartPage />} />

              {/* Checkout (Layer 1: UI only) */}
              <Route path="/checkout" element={<CheckoutPage />} />

              {/* Demo Payment (Layer 3) */}
              <Route path="/payment" element={<PaymentPage />} />

              {/* My Orders */}
              <Route path="/orders" element={<OrdersPage />} />

                            {/* My Profile */}
              <Route path="/profile" element={<ProfilePage />} />

              {/* My Addresses */}
              <Route path="/addresses" element={<AddressesPage />} />

              {/* Wishlist */}
              <Route path="/wishlist" element={<WishlistPage />} />
            </Routes>

          </main>
        </div>
        </BrowserRouter>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

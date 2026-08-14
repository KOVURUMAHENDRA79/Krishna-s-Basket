import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import CategoryNav from './components/CategoryNav/CategoryNav';
import HeroBanner from './components/HeroBanner/HeroBanner'; 
import ProductCarousel from './components/ProductCarousel/ProductCarousel';
import CategoryProducts from './components/CategoryProducts/CategoryProducts';
import ProductDetails from './components/ProductDetails/ProductDetails';
import CartPage from './components/CartPage/CartPage';
import SearchResults from './components/SearchResults/SearchResults';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
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
            </Routes>

          </main>
        </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import WishlistHeart from '../WishlistHeart/WishlistHeart';
import './ProductCarousel.css';

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
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(fullStars)}
      {'☆'.repeat(5 - fullStars)}
    </span>
  );
}

function ProductCarousel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/api/products?featured=true&limit=10'
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setProducts(data.products);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="product-carousel-section">
      <div className="section-header">
        <h2 className="section-title">Recommended Picks</h2>
        <a href="#view-all" className="view-all-link">View All {'>'}</a>
      </div>

      {loading && (
        <div className="carousel-container">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="product-card">
              <div className="product-image-container skeleton skeleton-image" />
              <div className="product-info">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line price" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="carousel-message">Unable to load products</div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="carousel-message">No products available.</div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="carousel-container">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <Link to={`/product/${product.id}`} className="product-card-link">

                <div className="product-image-container">
                  <img
                    src={product.image_url || FALLBACK_IMAGE}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />

                  <button
                    className="add-to-cart-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart(product);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    Add
                  </button>

                  <WishlistHeart productId={product.id} />
                </div>

                <div className="product-info">
                  <h3 className="product-title">{product.name}</h3>

                  <div className="product-rating">
                    {renderStars(product.rating)}
                    <span className="review-count">({product.review_count})</span>
                  </div>

                  <div className="product-price-row">
                    <span className="current-price">{formatPrice(product.price)}</span>
                    {product.original_price && (
                      <span className="original-price">{formatPrice(product.original_price)}</span>
                    )}
                    {product.discount_percentage > 0 && (
                      <span className="discount-tag">{product.discount_percentage}% Off</span>
                    )}
                  </div>
                </div>

              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductCarousel;

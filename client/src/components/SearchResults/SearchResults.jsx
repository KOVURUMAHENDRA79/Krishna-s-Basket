import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import { findFuzzyMatches } from '../../utils/fuzzy';
import WishlistHeart from '../WishlistHeart/WishlistHeart';
import '../ProductCarousel/ProductCarousel.css';
import './SearchResults.css';

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

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState('default');
  const { addToCart } = useCart();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    async function fetchProducts() {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/api/products?limit=1000'
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setAllProducts(data.products);
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

  const { matches, best } = useMemo(
    () => findFuzzyMatches(allProducts, query),
    [allProducts, query]
  );

  const results = useMemo(() => {
    if (sort === 'price_asc') {
      return [...matches].sort((a, b) => a.price - b.price);
    }
    if (sort === 'price_desc') {
      return [...matches].sort((a, b) => b.price - a.price);
    }
    return matches;
  }, [matches, sort]);

  const queryLower = query.toLowerCase();
  const hasExactMatch = results.some((product) =>
    product.name.toLowerCase().includes(queryLower)
  );
  const suggestion =
    best && !hasExactMatch && best.score >= 0.45 ? best.item : null;

  return (
    <section className="search-results-section">
      <div className="category-header">
        <h1 className="category-title">
          {query ? `Results for "${query}"` : 'Search Products'}
        </h1>
        {!loading && !error && query && (
          <span className="category-count">{results.length} products found</span>
        )}
        <select
          className="category-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort products"
        >
          <option value="default">Sort by: Featured</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {!loading && !error && suggestion && results.length > 0 && (
        <div className="did-you-mean">
          Showing results for
          {' '}
          <button
            type="button"
            className="did-you-mean-suggestion"
            onClick={() => setSearchParams({ q: suggestion.name })}
          >
            "{suggestion.name}"
          </button>
        </div>
      )}

      {loading && (
        <div className="category-products-grid">
          {Array.from({ length: 12 }).map((_, index) => (
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

      {!loading && !error && !query && (
        <div className="search-empty">
          <p className="carousel-message">
            Type something in the search bar to find products.
          </p>
          <Link to="/" className="search-empty-cta">Browse all products</Link>
        </div>
      )}

      {!loading && !error && query && results.length === 0 && (
        <div className="search-empty">
          <p className="carousel-message">
            No products found for "{query}".
          </p>
          {suggestion && (
            <p className="search-empty-suggestion">
              Did you mean{' '}
              <button
                type="button"
                className="did-you-mean-suggestion"
                onClick={() => setSearchParams({ q: suggestion.name })}
              >
                "{suggestion.name}"
              </button>
              ?
            </p>
          )}
          <Link to="/" className="search-empty-cta">Browse all products</Link>
        </div>
      )}

      {!loading && !error && query && results.length > 0 && (
        <div className="category-products-grid">
          {results.map((product) => (
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

export default SearchResults;

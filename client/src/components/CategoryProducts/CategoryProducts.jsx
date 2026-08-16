import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { categoryName } from '../../data/categories';
import { useCart } from '../../context/useCart';
import '../ProductCarousel/ProductCarousel.css';
import './CategoryProducts.css';

const PRODUCTS_PER_PAGE = 12;

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

function CategoryProducts() {
  const { categorySlug } = useParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);
  const { addToCart } = useCart();

  // A new category or sort order means a fresh result set → back to page 1.
  useEffect(() => {
    setPage(1);
  }, [categorySlug, sort]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);
    setProducts([]);

    async function fetchProducts() {
      try {
        const sortParam =
          sort === 'default' ? '' : `&sort=${encodeURIComponent(sort)}`;
        const response = await fetch(
          `http://127.0.0.1:8000/api/products?category=${encodeURIComponent(categorySlug)}${sortParam}&page=${page}&limit=${PRODUCTS_PER_PAGE}`
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setProducts(data.products);
          setPagination(data.pagination);
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
  }, [categorySlug, sort, page]);

  // When the user jumps to another page, bring the grid back into view
  // (the header is fixed, so scrolling to the top of the page works).
  useEffect(() => {
    if (page > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page]);

  return (
    <section className="category-products-section">
      <div className="category-header">
        <h1 className="category-title">{categoryName(categorySlug)}</h1>
        {!loading && !error && (
          <span className="category-count">
            {pagination ? pagination.total_products : products.length} products
          </span>
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

      {!loading && !error && products.length === 0 && (
        <div className="carousel-message">No products in this category.</div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="category-products-grid">
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

      {!loading && !error && pagination && pagination.total_pages > 1 && (
        <nav className="pagination" aria-label="Product pages">
          <button
            type="button"
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>

          {Array.from(
            { length: pagination.total_pages },
            (_, index) => index + 1
          ).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`pagination-btn ${pageNumber === page ? 'active' : ''}`}
              aria-current={pageNumber === page ? 'page' : undefined}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            className="pagination-btn"
            disabled={page === pagination.total_pages}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </nav>
      )}
    </section>
  );
}

export default CategoryProducts;

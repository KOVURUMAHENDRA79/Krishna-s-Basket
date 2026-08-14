import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import './ProductDetails.css';

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

function parseSpecifications(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed);
    }
  } catch {
    return null;
  }
  return null;
}

function ProductDetails() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);
    setProduct(null);

    async function fetchProduct() {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/products/${encodeURIComponent(productId)}`
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setProduct(data);
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

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const specifications = product ? parseSpecifications(product.specifications) : null;

  return (
    <section className="product-details-section">
      {loading && (
        <div className="product-details-layout">
          <div className="skeleton skeleton-image detail-skeleton-image" />
          <div className="product-details-info">
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line price" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="details-message">Unable to load product</div>
      )}

      {!loading && !error && !product && (
        <div className="details-message">Product not found.</div>
      )}

      {!loading && !error && product && (
        <>
          <div className="breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            {' / '}
            <span className="breadcrumb-current">{product.name}</span>
          </div>

          <div className="product-details-layout">

            <div className="product-details-image-container">
              <img
                src={product.image_url || FALLBACK_IMAGE}
                alt={product.name}
                className="product-details-image"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
            </div>

            <div className="product-details-info">
              {product.brand && <span className="detail-brand">{product.brand}</span>}
              <h1 className="detail-title">{product.name}</h1>

              <div className="detail-rating-row">
                {renderStars(product.rating)}
                <span className="detail-rating-value">{product.rating}</span>
                <span className="detail-review-count">({product.review_count} reviews)</span>
              </div>

              <div className="detail-price-row">
                <span className="detail-price">{formatPrice(product.price)}</span>
                {product.original_price && (
                  <span className="detail-original-price">{formatPrice(product.original_price)}</span>
                )}
                {product.discount_percentage > 0 && (
                  <span className="detail-discount">{product.discount_percentage}% Off</span>
                )}
              </div>

              {product.stock > 0 ? (
                <span className="detail-stock in-stock">In Stock ({product.stock} available)</span>
              ) : (
                <span className="detail-stock out-of-stock">Out of Stock</span>
              )}

              <button
                className="detail-add-to-cart"
                disabled={product.stock === 0}
                onClick={() => addToCart(product)}
              >
                Add to Cart
              </button>

              {product.description && (
                <div className="detail-description">
                  <h2 className="detail-section-title">Description</h2>
                  <p>{product.description}</p>
                </div>
              )}

              {specifications && (
                <div className="detail-specifications">
                  <h2 className="detail-section-title">Specifications</h2>
                  <table className="spec-table">
                    <tbody>
                      {specifications.map(([key, value]) => (
                        <tr key={key}>
                          <th>{key}</th>
                          <td>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </section>
  );
}

export default ProductDetails;

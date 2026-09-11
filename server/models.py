from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    ForeignKey,
    Text,
    DateTime,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    """
    By creating this Python class, SQLAlchemy will automatically reach into
    SQLite and build a table called "users" with these exact columns!
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)  # We never store raw passwords!
    full_name = Column(String)

    cart_items = relationship("CartItem", back_populates="user")
    orders = relationship("Order", back_populates="user")
    addresses = relationship("UserAddress", back_populates="user")
    wishlist_items = relationship("WishlistItem", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)

    brand = Column(String)
    subcategory = Column(String)

    description = Column(Text)

    price = Column(Float, nullable=False)
    original_price = Column(Float)
    discount_percentage = Column(Integer, default=0)

    rating = Column(Float, default=0)
    review_count = Column(Integer, default=0)

    stock = Column(Integer, default=0)

    image_url = Column(String)

    # We'll store specifications as JSON text for now.
    specifications = Column(Text)

    featured = Column(Boolean, default=False)

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False
    )

    category = relationship("Category", back_populates="products")

    cart_items = relationship("CartItem", back_populates="product")
    wishlist_items = relationship("WishlistItem", back_populates="product")


class CartItem(Base):
    """
    One row = one product inside one user's cart.
    Each user gets their OWN cart because we store user_id on every row.
    """
    __tablename__ = "cart_items"

    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_cart_item_user_product"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )
    quantity = Column(Integer, nullable=False, default=1)

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")


class Order(Base):
    """
    One row = one checkout placed by a user.
    We snapshot the shipping address and total here so the order
    stays intact even if the user/cart changes later.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    total_amount = Column(Float, nullable=False)

    # "pending" → created but payment not completed yet (Layer 3 will flip it).
    status = Column(String, nullable=False, default="pending")
    payment_status = Column(String, nullable=False, default="pending")
    payment_method = Column(String)

    # The delivery details the user typed on the checkout page, stored as JSON.
    shipping_address = Column(JSON, nullable=False)

    # Simple estimate for now: today + 5 days (a string like "2026-08-22").
    estimated_delivery = Column(String)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )


class OrderItem(Base):
    """
    One row = one product line inside one order.
    price is SNAPSHOTTED from the product at order time, so even if the
    product's price changes later, the order keeps what the buyer paid.
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)

    order_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )
    quantity = Column(Integer, nullable=False, default=1)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class UserAddress(Base):
    """
    One row = one saved delivery address belonging to one user.
    label is "home" / "work" / "other". Only ONE address per user
    may have is_default = True (enforced in the API, not by the DB).
    """
    __tablename__ = "user_addresses"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address_line = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    pincode = Column(String, nullable=False)

    label = Column(String, nullable=False, default="home")
    is_default = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="addresses")


class WishlistItem(Base):
    """
    One row = one product saved by one user.
    UNIQUE(user_id, product_id) means the same product can't be
    wishlisted twice by the same user (duplicate prevention).
    """
    __tablename__ = "wishlist_items"

    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    user = relationship("User", back_populates="wishlist_items")
    product = relationship("Product", back_populates="wishlist_items")

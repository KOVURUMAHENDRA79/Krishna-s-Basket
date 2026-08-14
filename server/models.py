from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
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

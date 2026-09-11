from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 1. Incoming Data Schema 
# When React sends a request to /signup, Pydantic will stand at the door
# and check that it perfectly contains a full_name, an email, and a password.
class UserCreate(BaseModel):
    full_name: str
    email: str 
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# 2. Outgoing Data Schema
# When FastAPI sends data BACK to React, we use this schema. 
# Notice that 'password' is NOT listed here! This means Pydantic will actively 
# strip the password out of the response so hackers can't intercept it.
class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str

    class Config:
        from_attributes = True # This tells Pydantic to cleanly translate SQLAlchemy database models into JSON


class UserUpdate(BaseModel):
    """What the Profile page can edit. Email stays read-only for now."""
    full_name: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


from typing import Optional


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str

    brand: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None

    price: float
    original_price: Optional[float] = None
    discount_percentage: int

    rating: float
    review_count: int

    stock: int

    image_url: Optional[str] = None
    specifications: Optional[str] = None

    featured: bool

    category_id: int

    class Config:
        from_attributes = True


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class ProductBrief(BaseModel):
    id: int
    name: str
    price: float
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class CartItemResponse(BaseModel):
    product_id: int
    quantity: int
    product: ProductBrief

    class Config:
        from_attributes = True


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_products: int
    total_pages: int


class ProductPage(BaseModel):
    products: list[ProductResponse]
    pagination: PaginationMeta


# ============================================================
# ORDER SCHEMAS
# ============================================================

# What the checkout page sends us in the POST body.
class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str


class OrderCreate(BaseModel):
    shipping_address: ShippingAddress
    payment_method: Optional[str] = None
    # Layer 3: the demo payment flow sends "paid" here ONLY after the
    # simulated gateway succeeded. Anything else keeps the order pending.
    payment_status: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float
    product: ProductBrief

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    payment_status: str
    payment_method: Optional[str] = None
    shipping_address: dict
    estimated_delivery: Optional[str] = None
    created_at: datetime
    items: list[OrderItemResponse]

    class Config:
        from_attributes = True


# ============================================================
# ADDRESS SCHEMAS
# ============================================================

class AddressCreate(BaseModel):
    full_name: str
    phone: str
    address_line: str
    city: str
    state: str
    pincode: str
    label: str = "home"
    is_default: bool = False


class AddressResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: str
    address_line: str
    city: str
    state: str
    pincode: str
    label: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# WISHLIST SCHEMAS
# ============================================================

class WishlistItemCreate(BaseModel):
    product_id: int


class WishlistItemResponse(BaseModel):
    """Flattened product info so the wishlist page needs no extra requests."""
    product_id: int
    name: str
    price: float
    original_price: Optional[float] = None
    discount_percentage: int = 0
    image_url: Optional[str] = None
    stock: int = 0
    rating: float = 0
    review_count: int = 0

from pydantic import BaseModel

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

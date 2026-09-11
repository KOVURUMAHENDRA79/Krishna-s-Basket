from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from math import ceil
from datetime import datetime, timedelta
import bcrypt
from database import engine, SessionLocal
import models
import schemas

app = FastAPI(title="AI E-Commerce Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

# Dependency: This creates a temporary, safe connection to the database for every single website click, then closes it.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/api/health")
def api_health():
    return {"status": "success", "message": "The Python AI Server is alive!"}


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer.")

    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        return False

    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


# === NEW SECURE SIGNUP ROUTE ===
# Notice response_model=schemas.UserResponse: This forces the output to be filtered!
@app.post("/api/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    
    # 1. Ask the Database: Does this email already exist?
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered!")

    # 2. THE SHREDDER: Cryptographically hash the raw password into gibberish
    hashed_pwd = hash_password(user.password)

    # 3. Format the data to match our SQLite table rules
    new_user = models.User(
        email=user.email, 
        full_name=user.full_name, 
        hashed_password=hashed_pwd
    )

    # 4. Save it permanently to the SQLite database file
    db.add(new_user)
    db.commit()      
    db.refresh(new_user) # Fetches the newly generated 'id' (e.g. User #1)

    # 5. Return the user to the frontend (Pydantic will automatically block the hashed_password from leaking)
    return new_user


@app.post("/api/login", response_model=schemas.UserResponse)
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not existing_user or not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return existing_user


# ============================================================
# PROFILE ROUTES
# ============================================================

def _get_user_or_404(user_id: int, db: Session):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Fetch the user's profile (id, email, full_name)."""
    return _get_user_or_404(user_id, db)


@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
):
    """Update editable profile fields (full_name for now)."""
    user = _get_user_or_404(user_id, db)

    full_name = user_data.full_name.strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty",
        )

    user.full_name = full_name
    db.commit()
    db.refresh(user)
    return user


@app.put("/api/users/{user_id}/password", response_model=schemas.UserResponse)
def change_password(
    user_id: int,
    password_data: schemas.PasswordChange,
    db: Session = Depends(get_db),
):
    """
    Change the user's password. We VERIFY the current password with bcrypt
    before replacing it — same verify_password()/hash_password() helpers
    the login and signup routes already use.
    """
    user = _get_user_or_404(user_id, db)

    if not verify_password(password_data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    user.hashed_password = hash_password(password_data.new_password)
    db.commit()
    db.refresh(user)
    return user

# ============================================================
# CATEGORY ROUTES
# ============================================================

@app.get("/api/categories", response_model=list[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).all()
    return categories


# ============================================================
# PRODUCT ROUTES
# ============================================================

@app.get("/api/products", response_model=schemas.ProductPage)
def get_products(
    db: Session = Depends(get_db),
    featured: bool | None = None,
    category: str | None = None,
    search: str | None = None,
    sort: str | None = None,
    page: int = 1,
    limit: int = 12,
):
    if not (1 <= limit <= 1000):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 1000",
        )

    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="page must be at least 1",
        )

    query = db.query(models.Product)

    if featured is not None:
        query = query.filter(models.Product.featured == featured)

    if category is not None:
        query = query.join(models.Category).filter(models.Category.slug == category)

    if search is not None:
        query = query.filter(models.Product.name.ilike(f"%{search.strip()}%"))

    if sort == "price_asc":
        query = query.order_by(models.Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(models.Product.price.desc())
    elif sort is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sort must be 'price_asc' or 'price_desc'",
        )

    # Count FIRST (after filters, before OFFSET/LIMIT) so the frontend
    # knows how many pages exist.
    total_products = query.count()
    total_pages = ceil(total_products / limit)

    # OFFSET = (page - 1) * limit  →  page 1 skips 0, page 2 skips 12, ...
    query = query.offset((page - 1) * limit).limit(limit)
    products = query.all()

    return {
        "products": products,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_products": total_products,
            "total_pages": total_pages,
        },
    }


@app.get("/api/products/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):

    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


# ============================================================
# CART ROUTES
# ============================================================
# NOTE: For learning purposes we pass user_id directly in the URL.
# In a real app it would come from a JWT or session (auth token).

def _get_full_cart(user_id: int, db: Session):
    """
    Validates the user exists and returns every cart item for that user.
    Used by ALL cart routes so error handling & ordering stay consistent.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(models.CartItem)
        .filter(models.CartItem.user_id == user_id)
        .order_by(models.CartItem.id)
        .all()
    )


@app.get("/api/users/{user_id}/cart", response_model=list[schemas.CartItemResponse])
def get_cart(user_id: int, db: Session = Depends(get_db)):
    """Fetch the user's cart from the DATABASE (not localStorage!)."""
    return _get_full_cart(user_id, db)


@app.post("/api/users/{user_id}/cart", response_model=list[schemas.CartItemResponse])
def add_to_cart(
    user_id: int,
    item: schemas.CartItemCreate,
    db: Session = Depends(get_db),
):
    """Add a product to the user's cart. If it's already there, bump the quantity."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if item.quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quantity must be at least 1",
        )

    cart_item = (
        db.query(models.CartItem)
        .filter(
            models.CartItem.user_id == user_id,
            models.CartItem.product_id == item.product_id,
        )
        .first()
    )

    if cart_item:
        cart_item.quantity += item.quantity
    else:
        cart_item = models.CartItem(
            user_id=user_id,
            product_id=item.product_id,
            quantity=item.quantity,
        )
        db.add(cart_item)

    db.commit()
    return _get_full_cart(user_id, db)


@app.patch("/api/users/{user_id}/cart/{product_id}", response_model=list[schemas.CartItemResponse])
def update_cart_quantity(
    user_id: int,
    product_id: int,
    item: schemas.CartItemUpdate,
    db: Session = Depends(get_db),
):
    """Change the quantity of one item (e.g. the +/- buttons on the cart page)."""
    cart_item = (
        db.query(models.CartItem)
        .filter(
            models.CartItem.user_id == user_id,
            models.CartItem.product_id == product_id,
        )
        .first()
    )

    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    if item.quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quantity must be at least 1",
        )

    cart_item.quantity = item.quantity
    db.commit()
    return _get_full_cart(user_id, db)


@app.delete("/api/users/{user_id}/cart/{product_id}", response_model=list[schemas.CartItemResponse])
def remove_from_cart(
    user_id: int,
    product_id: int,
    db: Session = Depends(get_db),
):
    """Remove a single product from the user's cart."""
    cart_item = (
        db.query(models.CartItem)
        .filter(
            models.CartItem.user_id == user_id,
            models.CartItem.product_id == product_id,
        )
        .first()
    )

    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    db.delete(cart_item)
    db.commit()
    return _get_full_cart(user_id, db)


@app.delete("/api/users/{user_id}/cart", response_model=list[schemas.CartItemResponse])
def clear_cart(user_id: int, db: Session = Depends(get_db)):
    """Empty the user's entire cart."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(models.CartItem).filter(models.CartItem.user_id == user_id).delete()
    db.commit()
    return []


# ============================================================
# ORDER ROUTES
# ============================================================
# NOTE: Same learning pattern as the cart — the user_id comes from the
# URL because we don't have a real token system yet.
# The order is created from the user's CURRENT cart, then the cart is
# cleared, so this whole endpoint is one atomic "checkout" transaction.

@app.post("/api/users/{user_id}/orders", response_model=schemas.OrderResponse)
def create_order(
    user_id: int,
    order_data: schemas.OrderCreate,
    db: Session = Depends(get_db),
):
    """Turn the user's cart into an Order + OrderItems, then empty the cart."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cart_items = _get_full_cart(user_id, db)
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty",
        )

    # Build order items from the cart, SNAPSHOTTING the product price
    # so the order keeps what was actually paid.
    total_amount = 0.0
    order_items = []
    for cart_item in cart_items:
        unit_price = cart_item.product.price
        total_amount += unit_price * cart_item.quantity
        order_items.append(
            models.OrderItem(
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                price=unit_price,
            )
        )

    # Layer 3: the frontend only posts this order AFTER its simulated
    # payment succeeded, so "paid" here means confirmed. A failed payment
    # never reaches this endpoint at all → no order, no falsely paid row.
    is_paid = order_data.payment_status == "paid"

    order = models.Order(
        user_id=user_id,
        total_amount=total_amount,
        status="confirmed" if is_paid else "pending",
        payment_status="paid" if is_paid else "pending",
        payment_method=order_data.payment_method,
        shipping_address=order_data.shipping_address.model_dump(),
        estimated_delivery=(datetime.utcnow() + timedelta(days=5)).date().isoformat(),
    )

    db.add(order)
    db.flush()  # assigns order.id so the items can reference it

    for item in order_items:
        item.order_id = order.id
        db.add(item)

    # The order now owns a copy of every cart line → the cart can be emptied.
    db.query(models.CartItem).filter(models.CartItem.user_id == user_id).delete()

    db.commit()
    db.refresh(order)

    return order


@app.get("/api/users/{user_id}/orders", response_model=list[schemas.OrderResponse])
def get_orders(user_id: int, db: Session = Depends(get_db)):
    """List every order that belongs to THIS user only (newest first)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(models.Order)
        .filter(models.Order.user_id == user_id)
        .order_by(models.Order.created_at.desc(), models.Order.id.desc())
        .all()
    )


@app.get("/api/users/{user_id}/orders/{order_id}", response_model=schemas.OrderResponse)
def get_order(user_id: int, order_id: int, db: Session = Depends(get_db)):
    """
    Fetch ONE order. We filter by BOTH order id AND user id, so a user can
    only ever see their own orders — order ids are not "guessable secrets".
    """
    order = (
        db.query(models.Order)
        .filter(
            models.Order.id == order_id,
            models.Order.user_id == user_id,
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order


# ============================================================
# ADDRESS ROUTES
# ============================================================

def _get_owned_address(user_id: int, address_id: int, db: Session):
    """
    Fetch one address using BOTH the address id and the user id.
    If the address belongs to someone else, this returns None → 404,
    so User A can never read/modify/delete User B's address.
    """
    return (
        db.query(models.UserAddress)
        .filter(
            models.UserAddress.id == address_id,
            models.UserAddress.user_id == user_id,
        )
        .first()
    )


def _clear_other_defaults(user_id: int, keep_address_id: int, db: Session):
    """The single-default rule: no other address of this user may stay default.
    keep_address_id may be None when the address doesn't exist yet (creation)."""
    query = db.query(models.UserAddress).filter(
        models.UserAddress.user_id == user_id,
        models.UserAddress.is_default.is_(True),
    )
    if keep_address_id is not None:
        query = query.filter(models.UserAddress.id != keep_address_id)
    query.update({models.UserAddress.is_default: False})


@app.post("/api/users/{user_id}/addresses", response_model=schemas.AddressResponse)
def create_address(
    user_id: int,
    address_data: schemas.AddressCreate,
    db: Session = Depends(get_db),
):
    """Save a new address. First address is ALWAYS default, unless the
    request explicitly asks for another one to become default."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    has_addresses = (
        db.query(models.UserAddress).filter(models.UserAddress.user_id == user_id).count() > 0
    )

    is_default = address_data.is_default or not has_addresses
    if is_default:
        _clear_other_defaults(user_id, keep_address_id=None, db=db)

    address = models.UserAddress(
        user_id=user_id,
        full_name=address_data.full_name,
        phone=address_data.phone,
        address_line=address_data.address_line,
        city=address_data.city,
        state=address_data.state,
        pincode=address_data.pincode,
        label=address_data.label,
        is_default=is_default,
    )

    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@app.get("/api/users/{user_id}/addresses", response_model=list[schemas.AddressResponse])
def get_addresses(user_id: int, db: Session = Depends(get_db)):
    """List the user's addresses, default first, then oldest first."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(models.UserAddress)
        .filter(models.UserAddress.user_id == user_id)
        .order_by(models.UserAddress.is_default.desc(), models.UserAddress.id.asc())
        .all()
    )


@app.put("/api/users/{user_id}/addresses/{address_id}", response_model=schemas.AddressResponse)
def update_address(
    user_id: int,
    address_id: int,
    address_data: schemas.AddressCreate,
    db: Session = Depends(get_db),
):
    """Edit an address. If the request asks to make it default, it becomes
    default (and no other address of this user stays default)."""
    address = _get_owned_address(user_id, address_id, db)
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    address.full_name = address_data.full_name
    address.phone = address_data.phone
    address.address_line = address_data.address_line
    address.city = address_data.city
    address.state = address_data.state
    address.pincode = address_data.pincode
    address.label = address_data.label

    if address_data.is_default and not address.is_default:
        _clear_other_defaults(user_id, keep_address_id=address.id, db=db)
        address.is_default = True

    db.commit()
    db.refresh(address)
    return address


@app.put(
    "/api/users/{user_id}/addresses/{address_id}/default",
    response_model=list[schemas.AddressResponse],
)
def set_default_address(user_id: int, address_id: int, db: Session = Depends(get_db)):
    """Make one of the user's addresses the default (the only one)."""
    address = _get_owned_address(user_id, address_id, db)
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    _clear_other_defaults(user_id, keep_address_id=address.id, db=db)
    address.is_default = True

    db.commit()
    return get_addresses(user_id, db)


@app.delete(
    "/api/users/{user_id}/addresses/{address_id}",
    response_model=list[schemas.AddressResponse],
)
def delete_address(user_id: int, address_id: int, db: Session = Depends(get_db)):
    """Delete an address. If it was the default, the oldest remaining
    address is promoted to default (the invariant: every user with at
    least one address has exactly one default)."""
    address = _get_owned_address(user_id, address_id, db)
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = address.is_default
    db.delete(address)
    db.flush()

    if was_default:
        next_address = (
            db.query(models.UserAddress)
            .filter(models.UserAddress.user_id == user_id)
            .order_by(models.UserAddress.id.asc())
            .first()
        )
        if next_address:
            next_address.is_default = True

    db.commit()
    return get_addresses(user_id, db)


# ============================================================
# WISHLIST ROUTES
# ============================================================

def _wishlist_payload(item: models.WishlistItem):
    """Flatten a wishlist row into the product info the frontend needs."""
    product = item.product
    return {
        "product_id": item.product_id,
        "name": product.name,
        "price": product.price,
        "original_price": product.original_price,
        "discount_percentage": product.discount_percentage,
        "image_url": product.image_url,
        "stock": product.stock,
        "rating": product.rating,
        "review_count": product.review_count,
    }


@app.get("/api/users/{user_id}/wishlist", response_model=list[schemas.WishlistItemResponse])
def get_wishlist(user_id: int, db: Session = Depends(get_db)):
    """List every wishlisted product for THIS user (newest first)."""
    _get_user_or_404(user_id, db)

    items = (
        db.query(models.WishlistItem)
        .filter(models.WishlistItem.user_id == user_id)
        .order_by(models.WishlistItem.id.desc())
        .all()
    )
    return [_wishlist_payload(item) for item in items]


@app.post("/api/users/{user_id}/wishlist", response_model=schemas.WishlistItemResponse)
def add_to_wishlist(
    user_id: int,
    item_data: schemas.WishlistItemCreate,
    db: Session = Depends(get_db),
):
    """Save a product to the wishlist. Adding the same product twice is a
    no-op (UNIQUE constraint) — the existing entry is simply returned."""
    _get_user_or_404(user_id, db)

    product = db.query(models.Product).filter(models.Product.id == item_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        db.query(models.WishlistItem)
        .filter(
            models.WishlistItem.user_id == user_id,
            models.WishlistItem.product_id == item_data.product_id,
        )
        .first()
    )
    if existing:
        return _wishlist_payload(existing)

    item = models.WishlistItem(user_id=user_id, product_id=item_data.product_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _wishlist_payload(item)


@app.delete(
    "/api/users/{user_id}/wishlist/{product_id}",
    response_model=list[schemas.WishlistItemResponse],
)
def remove_from_wishlist(user_id: int, product_id: int, db: Session = Depends(get_db)):
    """Remove a product from the wishlist. Returns the updated list."""
    _get_user_or_404(user_id, db)

    item = (
        db.query(models.WishlistItem)
        .filter(
            models.WishlistItem.user_id == user_id,
            models.WishlistItem.product_id == product_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")

    db.delete(item)
    db.commit()
    return get_wishlist(user_id, db)
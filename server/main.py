from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
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
# CATEGORY ROUTES
# ============================================================

@app.get("/api/categories", response_model=list[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).all()
    return categories


# ============================================================
# PRODUCT ROUTES
# ============================================================

@app.get("/api/products", response_model=list[schemas.ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    featured: bool | None = None,
    category: str | None = None,
    search: str | None = None,
    sort: str | None = None,
    limit: int | None = None,
):
    if limit is not None and not (1 <= limit <= 100):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 100",
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

    if limit is not None:
        query = query.limit(limit)

    products = query.all()
    return products


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
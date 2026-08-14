from database import SessionLocal
import models
import json
import os

db = SessionLocal()

# ============================================================
# CATEGORIES
# ============================================================

categories_data = [
    {"name": "Mobiles", "slug": "mobiles"},
    {"name": "Fashion", "slug": "fashion"},
    {"name": "Electronics", "slug": "electronics"},
    {"name": "Home", "slug": "home"},
    {"name": "Appliances", "slug": "appliances"},
    {"name": "Beauty", "slug": "beauty"},
    {"name": "Toys & Baby", "slug": "toys-baby"},
    {"name": "Furniture", "slug": "furniture"},
    {"name": "Travel", "slug": "travel"},
    {"name": "Grocery", "slug": "grocery"},
]

# ============================================================
# INSERT CATEGORIES
# ============================================================

category_objects = {}
categories_created = 0
categories_skipped = 0

for category_data in categories_data:
    existing_category = (
        db.query(models.Category)
        .filter(models.Category.slug == category_data["slug"])
        .first()
    )

    if existing_category:
        category_objects[category_data["slug"]] = existing_category
        categories_skipped += 1
        continue

    category = models.Category(
        name=category_data["name"],
        slug=category_data["slug"]
    )

    db.add(category)
    db.flush()
    category_objects[category_data["slug"]] = category
    categories_created += 1

# Commit categories before inserting products as requested
db.commit()

# Re-query all categories to ensure they are bound and have IDs after commit
categories = db.query(models.Category).all()
category_objects = {cat.slug: cat for cat in categories}

# ============================================================
# LOAD PRODUCTS FROM JSON
# ============================================================

script_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(script_dir, "data", "products.json")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

products_data = data["products"]

# ============================================================
# INSERT PRODUCTS
# ============================================================

products_created = 0
products_skipped = 0

for product_data in products_data:
    existing_product = (
        db.query(models.Product)
        .filter(models.Product.slug == product_data["slug"])
        .first()
    )

    if existing_product:
        products_skipped += 1
        continue

    category = category_objects.get(product_data["category"])
    if not category:
        print(f"Warning: Category '{product_data['category']}' not found for product {product_data['name']}. Skipping.")
        products_skipped += 1
        continue

    product = models.Product(
        name=product_data["name"],
        slug=product_data["slug"],
        brand=product_data.get("brand"),
        subcategory=product_data.get("subcategory"),
        description=product_data.get("description"),
        price=product_data["price"],
        original_price=product_data.get("original_price"),
        discount_percentage=product_data.get("discount_percentage", 0),
        rating=product_data.get("rating", 0.0),
        review_count=product_data.get("review_count", 0),
        stock=product_data.get("stock", 0),
        image_url=product_data.get("image_url", ""),
        specifications=json.dumps(product_data.get("specifications", {})),
        featured=product_data.get("featured", False),
        category_id=category.id
    )

    db.add(product)
    products_created += 1

db.commit()
db.close()

print("Seeding statistics:")
print(f"Categories created: {categories_created}, skipped: {categories_skipped}")
print(f"Products created: {products_created}, skipped: {products_skipped}")
print("Database seeded successfully!")
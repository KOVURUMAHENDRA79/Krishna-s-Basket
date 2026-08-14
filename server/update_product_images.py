from database import SessionLocal
import models
import json
import os

db = SessionLocal()

script_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(script_dir, "data", "products.json")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

products_data = data["products"]

updated = 0
skipped = 0

for product_data in products_data:
    existing_product = (
        db.query(models.Product)
        .filter(models.Product.slug == product_data["slug"])
        .first()
    )

    if not existing_product:
        skipped += 1
        continue

    existing_product.image_url = product_data["image_url"]
    updated += 1

db.commit()
db.close()

print(f"Updated: {updated} products")
print(f"Skipped: {skipped} products")

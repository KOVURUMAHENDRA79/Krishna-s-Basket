export const CATEGORIES = [
  { name: 'Mobiles', slug: 'mobiles' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Home', slug: 'home' },
  { name: 'Appliances', slug: 'appliances' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Toys & Baby', slug: 'toys-baby' },
  { name: 'Furniture', slug: 'furniture' },
  { name: 'Travel', slug: 'travel' },
  { name: 'Grocery', slug: 'grocery' },
];

export function categoryName(slug) {
  const found = CATEGORIES.find((cat) => cat.slug === slug);
  return found ? found.name : slug;
}

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  label: string;
  image: string;
};

export const products: Product[] = [
  {
    id: "arc-desk-lamp",
    name: "Arc desk lamp",
    category: "Desk",
    description: "Powder-coated steel · Chalk",
    price: 148,
    label: "Bestseller",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=82",
  },
  {
    id: "field-notes-set",
    name: "Field notes set",
    category: "Desk",
    description: "Recycled paper · Set of three",
    price: 24,
    label: "The daily ritual",
    image: "https://images.unsplash.com/photo-1455390582262-044c6d77cf65?auto=format&fit=crop&w=900&q=82",
  },
  {
    id: "studio-headphones",
    name: "Studio headphones",
    category: "Audio",
    description: "Wireless · Stone / graphite",
    price: 189,
    label: "New arrival",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82",
  },
  {
    id: "weekend-tote",
    name: "Weekend carryall",
    category: "Travel",
    description: "Organic canvas · Cobalt",
    price: 76,
    label: "Made to move",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=82",
  },
];
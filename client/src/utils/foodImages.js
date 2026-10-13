import { isValidImageUrl } from "./imageUtils";

// Utility to provide crisp, appetizing food imagery fallbacks
// matches dish names and category names to high-quality curated food visuals

const FOOD_PRESETS = [
  {
    keywords: ["burger", "patty"],
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    icon: "🍔",
  },
  {
    keywords: ["pizza", "slice", "cheesy"],
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    icon: "🍕",
  },
  {
    keywords: ["roll", "wrap", "frankie", "paneer roll", "chicken roll"],
    url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
    icon: "🌯",
  },
  {
    keywords: ["sandwich", "toast", "grilled"],
    url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
    icon: "🥪",
  },
  {
    keywords: ["dosa", "idli", "vada", "south indian", "sambhar"],
    url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80",
    icon: "🥞",
  },
  {
    keywords: ["samosa", "kachori", "pakora", "snack", "chaat", "puff"],
    url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
    icon: "🥟",
  },
  {
    keywords: ["biryani", "pulao", "fried rice", "rice"],
    url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
    icon: "🍛",
  },
  {
    keywords: ["noodle", "noodles", "chowmein", "maggi", "pasta"],
    url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80",
    icon: "🍜",
  },
  {
    keywords: ["thali", "curry", "paneer", "dal", "roti", "meal"],
    url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
    icon: "🍲",
  },
  {
    keywords: ["coffee", "cappuccino", "latte", "espresso", "cold coffee"],
    url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    icon: "☕",
  },
  {
    keywords: ["tea", "chai"],
    url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
    icon: "🫖",
  },
  {
    keywords: ["shake", "smoothie", "juice", "beverage", "drink", "cola", "mojito"],
    url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    icon: "🥤",
  },
  {
    keywords: ["dessert", "pastry", "cake", "sweet", "brownie", "ice cream"],
    url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    icon: "🍰",
  },
  {
    keywords: ["combo", "meal deal", "thali combo", "value"],
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
    icon: "🍱",
  },
];

const DEFAULT_FOOD_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";

export const getFoodImage = (itemOrName) => {
  if (!itemOrName) return DEFAULT_FOOD_IMAGE;

  // If item object has a valid non-empty image url, return it
  if (typeof itemOrName === "object") {
    if (
      itemOrName.image &&
      typeof itemOrName.image === "string" &&
      itemOrName.image.startsWith("http") &&
      isValidImageUrl(itemOrName.image)
    ) {
      return itemOrName.image;
    }
    const nameToMatch = (itemOrName.name || "").toLowerCase();
    const categoryName = (itemOrName.category?.name || itemOrName.category || "").toLowerCase();
    const match = FOOD_PRESETS.find((preset) =>
      preset.keywords.some((kw) => nameToMatch.includes(kw) || categoryName.includes(kw))
    );
    return match ? match.url : DEFAULT_FOOD_IMAGE;
  }

  const str = String(itemOrName).toLowerCase();
  const match = FOOD_PRESETS.find((preset) =>
    preset.keywords.some((kw) => str.includes(kw))
  );
  return match ? match.url : DEFAULT_FOOD_IMAGE;
};

export const getCategoryIcon = (categoryName) => {
  if (!categoryName) return "🍽️";
  const str = String(categoryName).toLowerCase();
  const match = FOOD_PRESETS.find((preset) =>
    preset.keywords.some((kw) => str.includes(kw))
  );
  return match ? match.icon : "🍽️";
};

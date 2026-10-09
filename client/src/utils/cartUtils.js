/**
 * Safely generates a unique key for a cart item distinguishing between
 * PRODUCT and COMBO types.
 */
export const getCartItemKey = (idOrItem, itemType = "PRODUCT") => {
  if (!idOrItem) return "";

  if (typeof idOrItem === "object") {
    const id = idOrItem.id || idOrItem._id;
    const type = idOrItem.itemType || itemType;
    return `${type}_${id}`;
  }

  return `${itemType}_${idOrItem}`;
};

/**
 * Validates a cart item data structure.
 */
export const isValidCartItem = (item) => {
  if (!item || typeof item !== "object") return false;
  const id = item.id || item._id;
  if (!id) return false;
  if (typeof item.name !== "string" || !item.name.trim()) return false;
  if (typeof item.price !== "number" || isNaN(item.price) || item.price < 0)
    return false;
  if (
    typeof item.quantity !== "number" ||
    isNaN(item.quantity) ||
    item.quantity < 1
  )
    return false;
  if (item.itemType && !["PRODUCT", "COMBO"].includes(item.itemType))
    return false;

  return true;
};

/**
 * Normalizes item properties into a standard cart representation without mutating the source.
 */
export const normalizeCartItem = (item, defaultType = "PRODUCT") => {
  if (!item || typeof item !== "object") return null;

  const id = item.id || item._id;
  const itemType = item.itemType || defaultType;

  return {
    id: String(id),
    itemType,
    name: String(item.name || "").trim(),
    image: item.image || "",
    price: Number(item.price) >= 0 ? Number(item.price) : 0,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    preparationTime:
      item.preparationTime !== undefined ? Number(item.preparationTime) : 10,
    description: item.description || "",
    stock: item.stock !== undefined ? Number(item.stock) : undefined,
    lowStockThreshold:
      item.lowStockThreshold !== undefined
        ? Number(item.lowStockThreshold)
        : undefined,
    isAvailable: item.isAvailable !== false,
  };
};

/**
 * Calculates subtotal for an individual item.
 */
export const calculateItemSubtotal = (item) => {
  if (!item) return 0;
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 0;
  return Math.max(0, price * quantity);
};

/**
 * Calculates subtotal for an entire array of cart items.
 */
export const calculateSubtotal = (items = []) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    return total + calculateItemSubtotal(item);
  }, 0);
};

/**
 * Calculates total quantity of items across the cart.
 */
export const calculateItemCount = (items = []) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    return total + (Number(item?.quantity) || 0);
  }, 0);
};

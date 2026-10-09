import React, { createContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  getCartItemKey,
  isValidCartItem,
  normalizeCartItem,
  calculateSubtotal,
  calculateItemCount,
} from "../utils/cartUtils";

export const CartContext = createContext(null);

const STORAGE_KEY = "canteen_cart";

const loadInitialCart = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    // Filter and normalize valid items
    const validItems = parsed
      .map((item) => normalizeCartItem(item))
      .filter((item) => isValidCartItem(item));
    return validItems;
  } catch (error) {
    console.warn("Failed to parse cart from localStorage. Resetting cart.", error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadInitialCart);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch (error) {
      console.warn("Failed to persist cart to localStorage:", error);
    }
  }, [items]);

  const itemCount = useMemo(() => calculateItemCount(items), [items]);
  const subtotal = useMemo(() => calculateSubtotal(items), [items]);

  const isInCart = useCallback(
    (id, itemType = "PRODUCT") => {
      const key = getCartItemKey(id, itemType);
      return items.some((item) => getCartItemKey(item) === key);
    },
    [items]
  );

  const getItemQuantity = useCallback(
    (id, itemType = "PRODUCT") => {
      const key = getCartItemKey(id, itemType);
      const found = items.find((item) => getCartItemKey(item) === key);
      return found ? found.quantity : 0;
    },
    [items]
  );

  const addProduct = useCallback((product) => {
    if (!product || !product.id) {
      return { success: false, message: "Invalid product data" };
    }
    if (product.isAvailable === false || product.stock === 0) {
      return { success: false, message: "Product is currently out of stock" };
    }

    const normalized = normalizeCartItem(product, "PRODUCT");
    if (!normalized) {
      return { success: false, message: "Failed to normalize product" };
    }

    const targetKey = getCartItemKey(normalized);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => getCartItemKey(item) === targetKey
      );

      if (existingIndex > -1) {
        return prevItems.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prevItems, { ...normalized, quantity: 1 }];
    });

    return { success: true, message: `Added ${product.name} to cart` };
  }, []);

  const addCombo = useCallback((combo) => {
    if (!combo || !combo.id) {
      return { success: false, message: "Invalid combo data" };
    }
    if (combo.isAvailable === false) {
      return { success: false, message: "Combo is currently unavailable" };
    }

    const normalized = normalizeCartItem(combo, "COMBO");
    if (!normalized) {
      return { success: false, message: "Failed to normalize combo" };
    }

    const targetKey = getCartItemKey(normalized);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => getCartItemKey(item) === targetKey
      );

      if (existingIndex > -1) {
        return prevItems.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prevItems, { ...normalized, quantity: 1 }];
    });

    return { success: true, message: `Added ${combo.name} to cart` };
  }, []);

  const removeItem = useCallback((id, itemType = "PRODUCT") => {
    const targetKey = getCartItemKey(id, itemType);
    setItems((prevItems) =>
      prevItems.filter((item) => getCartItemKey(item) !== targetKey)
    );
  }, []);

  const updateQuantity = useCallback((id, itemType = "PRODUCT", newQuantity) => {
    const targetKey = getCartItemKey(id, itemType);
    const qty = Math.floor(Number(newQuantity));

    if (qty <= 0) {
      setItems((prevItems) =>
        prevItems.filter((item) => getCartItemKey(item) !== targetKey)
      );
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        getCartItemKey(item) === targetKey ? { ...item, quantity: qty } : item
      )
    );
  }, []);

  const increaseQuantity = useCallback(
    (id, itemType = "PRODUCT") => {
      const current = getItemQuantity(id, itemType);
      updateQuantity(id, itemType, current + 1);
    },
    [getItemQuantity, updateQuantity]
  );

  const decreaseQuantity = useCallback(
    (id, itemType = "PRODUCT") => {
      const current = getItemQuantity(id, itemType);
      if (current <= 1) {
        removeItem(id, itemType);
      } else {
        updateQuantity(id, itemType, current - 1);
      }
    },
    [getItemQuantity, updateQuantity, removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getCartItemCount = useCallback(() => itemCount, [itemCount]);
  const getCartSubtotal = useCallback(() => subtotal, [subtotal]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  const value = {
    items,
    itemCount,
    subtotal,
    addProduct,
    addCombo,
    removeItem,
    increaseQuantity,
    decreaseQuantity,
    updateQuantity,
    clearCart,
    getItemQuantity,
    getCartItemCount,
    getCartSubtotal,
    isInCart,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

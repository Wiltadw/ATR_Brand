"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type CartItem = { productId: number; quantity: number };

type StoreState = {
  ready: boolean;
  cart: CartItem[];
  cartCount: number;
  wishlist: number[];
  addToCart: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: number) => void;
  inWishlist: (productId: number) => boolean;
};

const Ctx = createContext<StoreState | null>(null);

const CART_KEY = "atr.cart.v1";
const WISH_KEY = "atr.wishlist.v1";
const CHANGE_EVENT = "atr-store-change";
const MAX_QTY = 20;

// ───────── ذخیره‌سازی در مرورگر (localStorage) به‌عنوان «منبع بیرونی» ─────────
function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return ""; // حالت خصوصی مرورگر یا حافظه‌ی بسته
  }
}
function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ذخیره نشد؛ سایت بدون ذخیره‌سازی هم کار می‌کند */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb); // تب‌های دیگر
  window.addEventListener(CHANGE_EVENT, cb); // همین تب
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}
const subscribeNever = () => () => {};

function parseCart(raw: string): CartItem[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(v)) return [];
    return v
      .filter((i): i is CartItem => !!i && Number.isInteger(i.productId) && i.productId > 0 && Number.isInteger(i.quantity) && i.quantity > 0)
      .map((i) => ({ productId: i.productId, quantity: Math.min(i.quantity, MAX_QTY) }));
  } catch {
    return [];
  }
}
function parseWishlist(raw: string): number[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x > 0) : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // سرور و اولین رندر مرورگر مقدار خالی می‌بینند (بدون ناسازگاری)، بعد مقدار واقعی جایگزین می‌شود
  const cartRaw = useSyncExternalStore(subscribe, () => readRaw(CART_KEY), () => "");
  const wishRaw = useSyncExternalStore(subscribe, () => readRaw(WISH_KEY), () => "");
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);

  const cart = useMemo(() => parseCart(cartRaw), [cartRaw]);
  const wishlist = useMemo(() => parseWishlist(wishRaw), [wishRaw]);

  const saveCart = useCallback((next: CartItem[]) => writeRaw(CART_KEY, JSON.stringify(next)), []);

  const addToCart = useCallback(
    (productId: number, quantity = 1) => {
      const current = parseCart(readRaw(CART_KEY));
      const hit = current.find((i) => i.productId === productId);
      saveCart(
        hit
          ? current.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QTY) } : i))
          : [...current, { productId, quantity: Math.min(quantity, MAX_QTY) }],
      );
    },
    [saveCart],
  );

  const setQuantity = useCallback(
    (productId: number, quantity: number) => {
      const q = Math.max(1, Math.min(MAX_QTY, Math.floor(quantity) || 1));
      saveCart(parseCart(readRaw(CART_KEY)).map((i) => (i.productId === productId ? { ...i, quantity: q } : i)));
    },
    [saveCart],
  );

  const removeFromCart = useCallback(
    (productId: number) => saveCart(parseCart(readRaw(CART_KEY)).filter((i) => i.productId !== productId)),
    [saveCart],
  );

  const clearCart = useCallback(() => saveCart([]), [saveCart]);

  const toggleWishlist = useCallback((productId: number) => {
    const current = parseWishlist(readRaw(WISH_KEY));
    writeRaw(WISH_KEY, JSON.stringify(current.includes(productId) ? current.filter((x) => x !== productId) : [...current, productId]));
  }, []);

  const value = useMemo<StoreState>(
    () => ({
      ready,
      cart,
      cartCount: cart.reduce((s, i) => s + i.quantity, 0),
      wishlist,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      inWishlist: (id) => wishlist.includes(id),
    }),
    [ready, cart, wishlist, addToCart, setQuantity, removeFromCart, clearCart, toggleWishlist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore باید داخل StoreProvider استفاده شود");
  return v;
}

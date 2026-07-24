import { create } from "zustand"
import type { ShopItem } from "@/app/shop/types"

type CheckoutState = "idle" | "submitted"

type ShopStore = {
  cart: Record<string, number>
  checkoutState: CheckoutState
  addItem: (itemId: string) => void
  removeItem: (itemId: string) => void
  decrementItem: (itemId: string) => void
  clearCart: () => void
  beginFakeCheckout: () => void
  completeFakeCheckout: () => void
  getQuantity: (itemId: string) => number
  getCartCount: () => number
  getCartSubtotal: (items: ShopItem[]) => number
}

export const useShopStore = create<ShopStore>((set, get) => ({
  cart: {},
  checkoutState: "idle",

  addItem: (itemId) =>
    set((state) => ({
      cart: {
        ...state.cart,
        [itemId]: (state.cart[itemId] ?? 0) + 1,
      },
      checkoutState: "idle",
    })),

  removeItem: (itemId) =>
    set((state) => {
      const next = { ...state.cart }
      delete next[itemId]
      return { cart: next }
    }),

  decrementItem: (itemId) =>
    set((state) => {
      const nextQty = (state.cart[itemId] ?? 0) - 1
      if (nextQty <= 0) {
        const next = { ...state.cart }
        delete next[itemId]
        return { cart: next }
      }

      return {
        cart: {
          ...state.cart,
          [itemId]: nextQty,
        },
      }
    }),

  clearCart: () => set({ cart: {}, checkoutState: "idle" }),

  beginFakeCheckout: () => set({ checkoutState: "submitted" }),

  completeFakeCheckout: () => set({ cart: {}, checkoutState: "idle" }),

  getQuantity: (itemId) => get().cart[itemId] ?? 0,

  getCartCount: () =>
    Object.values(get().cart).reduce((sum, qty) => sum + qty, 0),

  getCartSubtotal: (items) =>
    items.reduce((sum, item) => {
      const qty = get().cart[item.id] ?? 0
      return sum + item.price * qty
    }, 0),
}))
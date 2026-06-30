import { create } from 'zustand';

const useCartStore = create((set) => ({
  items: [],
  
  addItem: (variant, quantity) => set((state) => {
    const existing = state.items.find((item) => item.id === variant.id);
    if (existing) {
      return {
        items: state.items.map((item) =>
          item.id === variant.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      };
    }
    return { items: [...state.items, { ...variant, quantity }] };
  }),

  updateQuantity: (variantId, quantity) => set((state) => ({
    items: state.items.map((item) =>
      item.id === variantId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    ),
  })),

  removeItem: (variantId) => set((state) => ({
    items: state.items.filter((item) => item.id !== variantId)
  })),

  clearCart: () => set({ items: [] }),
}));

export default useCartStore;

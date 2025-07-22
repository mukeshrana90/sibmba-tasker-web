import { createSlice } from "@reduxjs/toolkit";
import ProductActions from "../Actions/ProductActions";

const productSlice = createSlice({
  name: "products",
  initialState: {
    items: [],
    loading: false,
    productDetail: null,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // === GET PRODUCTS ===
    builder.addCase(ProductActions.fetchProducts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    // === GET PRODUCT BY ID ===
    builder.addCase(ProductActions.getProductById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(
      ProductActions.getProductById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.productDetail = action.payload.data; 
      }
    );

    builder.addCase(ProductActions.getProductById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.productDetail = null;
    });

    builder.addCase(ProductActions.fetchProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload.data; // Assuming your API returns { data: [...] }
    });
    builder.addCase(ProductActions.fetchProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // === ADD PRODUCT ===
    builder.addCase(ProductActions.addProduct.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(ProductActions.addProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.items.push(action.payload.data);
    });
    builder.addCase(ProductActions.addProduct.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // === UPDATE PRODUCT ===
    builder.addCase(ProductActions.updateProduct.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(ProductActions.updateProduct.fulfilled, (state, action) => {
      state.loading = false;
      const updated = action.payload.data;
      const index = state.items.findIndex((p) => p._id === updated._id);
      if (index !== -1) state.items[index] = updated;
    });
    builder.addCase(ProductActions.updateProduct.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // === DELETE PRODUCT ===
    builder.addCase(ProductActions.deleteProduct.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(ProductActions.deleteProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.items = state.items.filter((p) => p._id !== action.payload.id);
    });
    builder.addCase(ProductActions.deleteProduct.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export default productSlice.reducer;

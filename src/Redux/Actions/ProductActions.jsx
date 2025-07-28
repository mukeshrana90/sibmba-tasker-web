import { createAsyncThunk } from "@reduxjs/toolkit";
import Api from "../../Services/api";

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await Api.get("/corporate/product");
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to fetch products");
    }
  }
);

export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await Api.post("/corporate/product", productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Add failed");
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const response = await Api.put(`/corporate/product/${id}`, productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Update failed");
    }
  }
);

// 4. Delete Product
export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id, { rejectWithValue }) => {
    try {
      await Api.delete(`/corporate/product/${id}`);
      return { id };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Delete failed");
    }
  }
);

export const getProductById = createAsyncThunk(
  "products/getProductById",
  async ({ id }, { rejectWithValue }) => {
    try {
      const response = await Api.get(`/corporate/product/${id}`);
      return response.data; // This should return { data: { ...product } }
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to fetch product");
    }
  }
);
  export const removeProduct = createAsyncThunk(
    "products/removeProduct",
    async (productId, thunkAPI) => {
      try {
        const response = await Api.delete(`/corporate/product/${productId}`);
        return response.data;
      } catch (error) {
        return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
      }
    }
  );


export default {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  removeProduct
};

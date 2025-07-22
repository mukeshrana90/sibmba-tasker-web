import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
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
      const response = await Api.post("/corporate/products", productData);
      toast.success("Product added successfully!");
      return response.data;
    } catch (error) {
      toast.error("Failed to add product.");
      return rejectWithValue(error?.response?.data?.message || "Add failed");
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const response = await Api.put(`/corporate/products/${id}`, productData);
      toast.success("Product updated successfully!");
      return response.data;
    } catch (error) {
      toast.error("Failed to update product.");
      return rejectWithValue(error?.response?.data?.message || "Update failed");
    }
  }
);

// 4. Delete Product
export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id, { rejectWithValue }) => {
    try {
      await Api.delete(`/corporate/products/${id}`);
      toast.success("Product deleted successfully!");
      return { id };
    } catch (error) {
      toast.error("Failed to delete product.");
      return rejectWithValue(error?.response?.data?.message || "Delete failed");
    }
  }
);

export default {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
};

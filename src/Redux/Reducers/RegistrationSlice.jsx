import { createSlice } from "@reduxjs/toolkit";
import CustomerActions from "../Actions/CustomerActions";
import { toast } from "react-toastify";

const customerSlice = createSlice({
  name: "customer",
  initialState: {
    customer: null,
    loading: false,
    error: null, 
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(CustomerActions.createCustomer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      CustomerActions.createCustomer.fulfilled,
      (state, action) => {
        state.loading = false;
        state.customer = action.payload;
        if (action.payload.status_code === 200) {
          toast.success("OTP has been sent to your provided email")
        } else if (action.payload.status_code === 400) {
          toast.error(action.payload?.message);
        } else {
          toast.error(action.payload?.message);
        }
      }
    );
    builder.addCase(
      CustomerActions.createCustomer.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload?.message || "Something went wrong");
      }
    );
  },
});

export default customerSlice.reducer;

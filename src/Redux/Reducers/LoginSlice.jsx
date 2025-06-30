import { createSlice } from "@reduxjs/toolkit";
import CustomerActions from "../Actions/CustomerActions";

const loginSlice = createSlice({
  name: "login",
  initialState: {
    isLoading: false,
    error: null,
    success: false,
    data: null,
    customerDetails: null,
    otherProfileData: null
  },
  reducers: {
    setCustomer: (state, action) => {
      console.log(action.payload, "action.payload");
      state.customerDetails = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(CustomerActions.loginCustomer.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(
      CustomerActions.loginCustomer.fulfilled,
      (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        // if (action.payload.success) {
        //   toast.success(action.payload?.message);
        // } else {
        //   toast.error(action.payload?.message);
        // }
      }
    );
    builder.addCase(CustomerActions.loginCustomer.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    //   toast.error(action.payload?.message || "Something went wrong");
    });
  },
});

export const { setCustomer } = loginSlice.actions;
export default loginSlice.reducer;

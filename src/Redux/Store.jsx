import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import customerSlice from "./Reducers/RegistrationSlice";
import serviceSlice from "./Reducers/ServiceSlice";
import loginSlice from "./Reducers/LoginSlice";
import UserSlice from "./Reducers/UserSlice";
import ProductSlice from "./Reducers/productSlice";
import corporateSlice from "./Reducers/corporateSlice";


const rootReducer = combineReducers({
  customer: customerSlice,
  service: serviceSlice,
  products: ProductSlice,
  login: loginSlice,
  UserSlice:UserSlice,
  corporateSlice:corporateSlice,
});

const Store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default Store;

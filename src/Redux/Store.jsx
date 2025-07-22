import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import customerSlice from "./Reducers/RegistrationSlice";
import serviceSlice from "./Reducers/ServiceSlice";
import loginSlice from "./Reducers/LoginSlice";
import UserSlice from "./Reducers/UserSlice";
import ProductSlice from "./Reducers/productSlice";


const rootReducer = combineReducers({
  customer: customerSlice,
  service: serviceSlice,
  products: ProductSlice,
  login: loginSlice,
  UserSlice:UserSlice,

});

const Store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default Store;

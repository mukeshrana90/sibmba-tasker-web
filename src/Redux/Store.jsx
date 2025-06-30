import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import customerSlice from "./Reducers/RegistrationSlice";
import serviceSlice from "./Reducers/ServiceSlice";
import loginSlice from "./Reducers/LoginSlice";
import UserSlice from "./Reducers/UserSlice";

const rootReducer = combineReducers({
  customer: customerSlice,
  service: serviceSlice,
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

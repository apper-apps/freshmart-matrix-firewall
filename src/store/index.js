import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import cartSlice from "./cartSlice";
import notificationSlice from "./notificationSlice";
import approvalWorkflowSlice from "./approvalWorkflowSlice";
import reviewSlice from "./reviewSlice";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["cart", "approvalWorkflow", "priceVisibility", "reviews"]
};

const rootReducer = combineReducers({
  cart: cartSlice,
  notifications: notificationSlice,
  approvalWorkflow: approvalWorkflowSlice,
  reviews: reviewSlice
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"]
      }
    })
});

export const persistor = persistStore(store);
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./authSlice"
import adminReducer from "./adminSlice"
import themeReducer from "./themeSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
    theme: themeReducer,
  },
})

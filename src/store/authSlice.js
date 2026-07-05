import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { apiRequest } from "../lib/api"

const storedToken = localStorage.getItem("dashboardToken")
const storedUser = localStorage.getItem("dashboardUser")

const parseStoredUser = () => {
  if (!storedUser) return null
  try {
    return JSON.parse(storedUser)
  } catch {
    return null
  }
}

const assertAdmin = (user) => {
  if (user?.role !== "admin" && user?.role !== "superAdmin") {
    throw new Error("Only admin and super admin accounts can access this dashboard")
  }
}

export const loginUser = createAsyncThunk("auth/login", async (credentials) => {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: credentials,
  })

  const user = response.data?.user
  assertAdmin(user)

  return {
    token: response.data.token,
    user,
  }
})

export const fetchMe = createAsyncThunk("auth/me", async (_, { getState }) => {
  const token = getState().auth.token
  const response = await apiRequest("/auth/me", { token })
  const user = response.data?.user
  assertAdmin(user)
  return user
})

export const registerDashboardUser = createAsyncThunk(
  "auth/dashboardRegister",
  async (payload) => {
    return apiRequest("/auth/dashboard-register", {
      method: "POST",
      body: payload,
    })
  },
)

export const forgotPassword = createAsyncThunk("auth/forgotPassword", async (payload) => {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: payload,
  })
})

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password }) => {
    return apiRequest(`/auth/reset-password/${token}`, {
      method: "PATCH",
      body: { password },
    })
  },
)

export const verifyEmail = createAsyncThunk("auth/verifyEmail", async (token) => {
  return apiRequest(`/auth/verify-email/${token}`)
})

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: storedToken,
    user: parseStoredUser(),
    status: "idle",
    error: null,
    message: null,
  },
  reducers: {
    logout(state) {
      state.token = null
      state.user = null
      state.status = "idle"
      state.error = null
      state.message = null
      localStorage.removeItem("dashboardToken")
      localStorage.removeItem("dashboardUser")
    },
    clearAuthError(state) {
      state.error = null
      state.message = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading"
        state.error = null
        state.message = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.token = action.payload.token
        state.user = action.payload.user
        localStorage.setItem("dashboardToken", action.payload.token)
        localStorage.setItem("dashboardUser", JSON.stringify(action.payload.user))
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.error.message
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload
        localStorage.setItem("dashboardUser", JSON.stringify(action.payload))
      })
      .addCase(fetchMe.rejected, (state) => {
        state.token = null
        state.user = null
        localStorage.removeItem("dashboardToken")
        localStorage.removeItem("dashboardUser")
      })
      .addMatcher(
        (action) =>
          [
            registerDashboardUser.pending.type,
            forgotPassword.pending.type,
            resetPassword.pending.type,
            verifyEmail.pending.type,
          ].includes(action.type),
        (state) => {
          state.status = "loading"
          state.error = null
          state.message = null
        },
      )
      .addMatcher(
        (action) =>
          [
            registerDashboardUser.fulfilled.type,
            forgotPassword.fulfilled.type,
            resetPassword.fulfilled.type,
            verifyEmail.fulfilled.type,
          ].includes(action.type),
        (state, action) => {
          state.status = "succeeded"
          state.message = action.payload.message
        },
      )
      .addMatcher(
        (action) =>
          [
            registerDashboardUser.rejected.type,
            forgotPassword.rejected.type,
            resetPassword.rejected.type,
            verifyEmail.rejected.type,
          ].includes(action.type),
        (state, action) => {
          state.status = "failed"
          state.error = action.error.message
        },
      )
  },
})

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer

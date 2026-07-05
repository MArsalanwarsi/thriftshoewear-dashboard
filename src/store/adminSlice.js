import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { apiRequest } from "../lib/api"
import { RESOURCE_CONFIG } from "../config/resources"

const resourceState = Object.keys(RESOURCE_CONFIG).reduce((state, key) => {
  state[key] = {
    items: [],
    meta: null,
    status: "idle",
    error: null,
    lastUpdated: null,
  }
  return state
}, {})

const tokenFromState = (getState) => getState().auth.token

export const fetchDashboard = createAsyncThunk(
  "admin/fetchDashboard",
  async (_, { getState }) => {
    return apiRequest("/site/dashboard", { token: tokenFromState(getState) })
  },
)

export const fetchResource = createAsyncThunk(
  "admin/fetchResource",
  async ({ resource, params = {} }, { getState }) => {
    const config = RESOURCE_CONFIG[resource]
    const response = await apiRequest(config.endpoint, {
      token: tokenFromState(getState),
      params,
    })

    return {
      resource,
      items: response.data?.[config.dataKey] || [],
      data: response.data || {},
      meta: response.meta || null,
    }
  },
)

export const createRecord = createAsyncThunk(
  "admin/createRecord",
  async ({ resource, body }, { getState }) => {
    const config = RESOURCE_CONFIG[resource]
    const response = await apiRequest(config.endpoint, {
      method: "POST",
      body,
      token: tokenFromState(getState),
    })

    return { resource, response }
  },
)

export const updateRecord = createAsyncThunk(
  "admin/updateRecord",
  async ({ resource, id, body }, { getState }) => {
    const config = RESOURCE_CONFIG[resource]
    const response = await apiRequest(`${config.endpoint}/${id}`, {
      method: "PATCH",
      body,
      token: tokenFromState(getState),
    })

    return { resource, response }
  },
)

export const deleteRecord = createAsyncThunk(
  "admin/deleteRecord",
  async ({ resource, id }, { getState }) => {
    const config = RESOURCE_CONFIG[resource]
    await apiRequest(`${config.endpoint}/${id}`, {
      method: "DELETE",
      token: tokenFromState(getState),
    })

    return { resource, id }
  },
)

export const runRecordAction = createAsyncThunk(
  "admin/runRecordAction",
  async ({ resource, endpoint, method = "PATCH", body = {} }, { getState }) => {
    const response = await apiRequest(endpoint, {
      method,
      body,
      token: tokenFromState(getState),
    })

    return { resource, response }
  },
)

export const fetchSettings = createAsyncThunk(
  "admin/fetchSettings",
  async (_, { getState }) => {
    return apiRequest("/site/settings", { token: tokenFromState(getState) })
  },
)

export const updateSettings = createAsyncThunk(
  "admin/updateSettings",
  async (body, { getState }) => {
    return apiRequest("/site/settings", {
      method: "PATCH",
      body,
      token: tokenFromState(getState),
    })
  },
)

const replaceOrPrepend = (items, record) => {
  if (!record?._id) return items
  const exists = items.some((item) => item._id === record._id)
  if (!exists) return [record, ...items]
  return items.map((item) => (item._id === record._id ? record : item))
}

const findRecordInResponse = (resource, response) => {
  const config = RESOURCE_CONFIG[resource]
  return response.data?.[config.singleKey]
}

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    dashboard: {
      data: null,
      status: "idle",
      error: null,
    },
    settings: {
      data: null,
      status: "idle",
      error: null,
    },
    resources: resourceState,
    mutation: {
      status: "idle",
      error: null,
      message: null,
    },
  },
  reducers: {
    clearMutation(state) {
      state.mutation = {
        status: "idle",
        error: null,
        message: null,
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.dashboard.status = "loading"
        state.dashboard.error = null
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashboard.status = "succeeded"
        state.dashboard.data = action.payload.data
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.dashboard.status = "failed"
        state.dashboard.error = action.error.message
      })
      .addCase(fetchResource.pending, (state, action) => {
        state.resources[action.meta.arg.resource].status = "loading"
        state.resources[action.meta.arg.resource].error = null
      })
      .addCase(fetchResource.fulfilled, (state, action) => {
        const resource = state.resources[action.payload.resource]
        resource.items = action.payload.items
        resource.meta = action.payload.meta
        resource.status = "succeeded"
        resource.error = null
        resource.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchResource.rejected, (state, action) => {
        const resource = state.resources[action.meta.arg.resource]
        resource.status = "failed"
        resource.error = action.error.message
      })
      .addCase(createRecord.pending, (state) => {
        state.mutation.status = "loading"
        state.mutation.error = null
      })
      .addCase(createRecord.fulfilled, (state, action) => {
        const record = findRecordInResponse(action.payload.resource, action.payload.response)
        const resource = state.resources[action.payload.resource]
        resource.items = replaceOrPrepend(resource.items, record)
        state.mutation.status = "succeeded"
        state.mutation.message = action.payload.response.message
      })
      .addCase(createRecord.rejected, (state, action) => {
        state.mutation.status = "failed"
        state.mutation.error = action.error.message
      })
      .addCase(updateRecord.pending, (state) => {
        state.mutation.status = "loading"
        state.mutation.error = null
      })
      .addCase(updateRecord.fulfilled, (state, action) => {
        const record = findRecordInResponse(action.payload.resource, action.payload.response)
        const resource = state.resources[action.payload.resource]
        resource.items = replaceOrPrepend(resource.items, record)
        state.mutation.status = "succeeded"
        state.mutation.message = action.payload.response.message
      })
      .addCase(updateRecord.rejected, (state, action) => {
        state.mutation.status = "failed"
        state.mutation.error = action.error.message
      })
      .addCase(deleteRecord.pending, (state) => {
        state.mutation.status = "loading"
        state.mutation.error = null
      })
      .addCase(deleteRecord.fulfilled, (state, action) => {
        const resource = state.resources[action.payload.resource]
        resource.items = resource.items.filter((item) => item._id !== action.payload.id)
        state.mutation.status = "succeeded"
        state.mutation.message = "Record deleted successfully"
      })
      .addCase(deleteRecord.rejected, (state, action) => {
        state.mutation.status = "failed"
        state.mutation.error = action.error.message
      })
      .addCase(runRecordAction.pending, (state) => {
        state.mutation.status = "loading"
        state.mutation.error = null
      })
      .addCase(runRecordAction.fulfilled, (state, action) => {
        const record = findRecordInResponse(action.payload.resource, action.payload.response)
        const resource = state.resources[action.payload.resource]
        if (record) resource.items = replaceOrPrepend(resource.items, record)
        state.mutation.status = "succeeded"
        state.mutation.message = action.payload.response.message
      })
      .addCase(runRecordAction.rejected, (state, action) => {
        state.mutation.status = "failed"
        state.mutation.error = action.error.message
      })
      .addCase(fetchSettings.pending, (state) => {
        state.settings.status = "loading"
        state.settings.error = null
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settings.status = "succeeded"
        state.settings.data = action.payload.data?.settings
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.settings.status = "failed"
        state.settings.error = action.error.message
      })
      .addCase(updateSettings.pending, (state) => {
        state.settings.status = "loading"
        state.settings.error = null
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings.status = "succeeded"
        state.settings.data = action.payload.data?.settings
        state.mutation.status = "succeeded"
        state.mutation.message = action.payload.message
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.settings.status = "failed"
        state.settings.error = action.error.message
        state.mutation.status = "failed"
        state.mutation.error = action.error.message
      })
  },
})

export const { clearMutation } = adminSlice.actions
export default adminSlice.reducer

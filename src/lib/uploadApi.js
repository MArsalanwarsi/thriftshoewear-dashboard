import { API_BASE_URL } from "./api"

/**
 * Retrieve the active authentication token from localStorage
 */
export function getAuthToken() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("dashboardToken") || ""
}

/**
 * Handle 401 unauthorized session expiry
 */
function handleAuthExpiry() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("dashboardToken")
    localStorage.removeItem("dashboardUser")
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
  }
}

/**
 * Upload a single file with live progress tracking (0% - 100%)
 * Supports signatures:
 *   uploadSingle(file, onProgress)
 *   uploadSingle(file, { onProgress, folder })
 *   uploadSingle(file, onProgress, { folder })
 *
 * @param {File} file
 * @param {Function|Object} onProgressOrOptions
 * @param {Object} [extraOptions]
 * @returns {Promise<{ success: boolean, url: string, key: string, size: number, format: string, width?: number, height?: number, originalName?: string }>}
 */
export function uploadSingle(file, onProgressOrOptions, extraOptions = {}) {
  let onProgress = null
  let folder = "products"

  if (typeof onProgressOrOptions === "function") {
    onProgress = onProgressOrOptions
    if (extraOptions.folder) folder = extraOptions.folder
  } else if (onProgressOrOptions && typeof onProgressOrOptions === "object") {
    if (typeof onProgressOrOptions.onProgress === "function") {
      onProgress = onProgressOrOptions.onProgress
    }
    if (onProgressOrOptions.folder) {
      folder = onProgressOrOptions.folder
    }
  }

  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided for upload"))
    }

    const xhr = new XMLHttpRequest()
    const url = `${API_BASE_URL}/upload/single`
    xhr.open("POST", url, true)

    const token = getAuthToken()
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }
    xhr.setRequestHeader("Accept", "application/json")

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
          onProgress(percent)
        }
      }
    }

    xhr.onload = () => {
      let data = {}
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {}
      } catch {
        return reject(new Error(`Server returned invalid response (status ${xhr.status})`))
      }

      if (xhr.status === 401) {
        handleAuthExpiry()
        return reject(new Error("Authentication expired. Please log in again."))
      }

      if (xhr.status >= 200 && xhr.status < 300 && (data.success || data.url)) {
        if (typeof onProgress === "function") onProgress(100)
        resolve({
          success: true,
          url: data.url,
          key: data.key,
          size: data.size,
          format: data.format,
          width: data.width,
          height: data.height,
          originalName: data.originalName || file.name,
          mediaId: data.mediaId || data._id,
        })
      } else {
        const errorMsg = data.message || `Upload failed with status ${xhr.status}`
        reject(new Error(errorMsg))
      }
    }

    xhr.onerror = () => reject(new Error("Network connection error during image upload"))
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please check your network."))

    const formData = new FormData()
    formData.append("file", file)
    formData.append("image", file)
    if (folder) formData.append("folder", folder)

    xhr.send(formData)
  })
}

/**
 * Upload multiple files with live progress tracking (0% - 100%)
 * Supports signatures:
 *   uploadMultiple(files, onProgress)
 *   uploadMultiple(files, { onProgress, folder })
 *   uploadMultiple(files, onProgress, { folder })
 *
 * @param {File[]|FileList} files
 * @param {Function|Object} onProgressOrOptions
 * @param {Object} [extraOptions]
 * @returns {Promise<{ success: boolean, files: Array<{ url: string, key: string, size: number, format: string, width?: number, height?: number, originalName?: string }> }>}
 */
export function uploadMultiple(files, onProgressOrOptions, extraOptions = {}) {
  let onProgress = null
  let folder = "products"

  if (typeof onProgressOrOptions === "function") {
    onProgress = onProgressOrOptions
    if (extraOptions.folder) folder = extraOptions.folder
  } else if (onProgressOrOptions && typeof onProgressOrOptions === "object") {
    if (typeof onProgressOrOptions.onProgress === "function") {
      onProgress = onProgressOrOptions.onProgress
    }
    if (onProgressOrOptions.folder) {
      folder = onProgressOrOptions.folder
    }
  }

  const fileArray = Array.from(files || [])
  if (fileArray.length === 0) {
    return Promise.reject(new Error("No files selected for upload"))
  }
  if (fileArray.length > 10) {
    return Promise.reject(new Error("A maximum of 10 files can be uploaded simultaneously"))
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = `${API_BASE_URL}/upload/multiple`
    xhr.open("POST", url, true)

    const token = getAuthToken()
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }
    xhr.setRequestHeader("Accept", "application/json")

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
          onProgress(percent)
        }
      }
    }

    xhr.onload = () => {
      let data = {}
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {}
      } catch {
        return reject(new Error(`Server returned invalid response (status ${xhr.status})`))
      }

      if (xhr.status === 401) {
        handleAuthExpiry()
        return reject(new Error("Authentication expired. Please log in again."))
      }

      if (xhr.status >= 200 && xhr.status < 300 && (data.success || Array.isArray(data.files))) {
        if (typeof onProgress === "function") onProgress(100)
        resolve({
          success: true,
          files: data.files || [],
        })
      } else {
        const errorMsg = data.message || `Multiple upload failed with status ${xhr.status}`
        reject(new Error(errorMsg))
      }
    }

    xhr.onerror = () => reject(new Error("Network connection error during multiple upload"))
    xhr.ontimeout = () => reject(new Error("Multiple upload timed out"))

    const formData = new FormData()
    fileArray.forEach((f) => {
      formData.append("files", f)
      formData.append("images", f)
    })
    if (folder) formData.append("folder", folder)

    xhr.send(formData)
  })
}

/**
 * Fetch paginated media assets from Cloudflare R2 via backend
 *
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=24]
 * @param {string} [params.search=""]
 * @param {string} [params.format=""]
 * @param {string} [params.folder=""]
 * @returns {Promise<{ success: boolean, media: Array<Object>, pagination: { page: number, limit: number, total: number, pages: number } }>}
 */
export async function fetchMedia({
  page = 1,
  limit = 24,
  search = "",
  format = "",
  folder = "",
} = {}) {
  const query = new URLSearchParams()
  if (page) query.set("page", String(page))
  if (limit) query.set("limit", String(limit))
  if (search && String(search).trim()) query.set("search", String(search).trim())
  if (format && String(format).trim()) query.set("format", String(format).trim().toLowerCase())
  if (folder && folder !== "all" && String(folder).trim()) query.set("folder", String(folder).trim())

  const token = getAuthToken()
  const url = `${API_BASE_URL}/upload/media?${query.toString()}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    throw new Error(`Failed to parse media library response (status ${response.status})`)
  }

  if (response.status === 401) {
    handleAuthExpiry()
    throw new Error("Authentication expired. Please log in again.")
  }

  if (!response.ok) {
    throw new Error(data.message || `Failed to fetch media (status ${response.status})`)
  }

  return {
    success: true,
    media: Array.isArray(data.media) ? data.media : [],
    pagination: data.pagination || {
      page: Number(page) || 1,
      limit: Number(limit) || 24,
      total: Array.isArray(data.media) ? data.media.length : 0,
      pages: 1,
    },
  }
}

/**
 * Permanently delete image from Cloudflare R2 and media library
 *
 * @param {string} keyOrUrl
 * @returns {Promise<{ success: boolean, message: string, key: string }>}
 */
export async function deleteMedia(keyOrUrl) {
  if (!keyOrUrl) {
    throw new Error("A media key or URL is required for deletion")
  }

  const token = getAuthToken()
  const cleanKey = String(keyOrUrl).trim()
  const isUrl = cleanKey.startsWith("http://") || cleanKey.startsWith("https://")

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(isUrl ? { url: cleanKey } : { key: cleanKey }),
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    throw new Error(`Failed to parse deletion response (status ${response.status})`)
  }

  if (response.status === 401) {
    handleAuthExpiry()
    throw new Error("Authentication expired. Please log in again.")
  }

  if (!response.ok) {
    throw new Error(data.message || `Failed to delete media (status ${response.status})`)
  }

  return {
    success: true,
    message: data.message || "Media deleted successfully",
    key: data.key || cleanKey,
  }
}

/**
 * Retrieve live Cloudflare R2 storage metrics from backend
 *
 * @param {Object} [options]
 * @param {boolean} [options.sync=false]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function fetchStorageStats({ sync = false } = {}) {
  const token = getAuthToken()
  const query = sync ? "?sync=true" : ""
  const url = `${API_BASE_URL}/upload/storage-stats${query}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    throw new Error(`Failed to parse storage statistics response (status ${response.status})`)
  }

  if (response.status === 401) {
    handleAuthExpiry()
    throw new Error("Authentication expired. Please log in again.")
  }

  if (!response.ok) {
    throw new Error(data.message || `Failed to fetch storage statistics (status ${response.status})`)
  }

  return {
    success: true,
    data: data.data || data,
  }
}

// Aliases for compatibility
export const uploadSingleFile = uploadSingle
export const uploadMultipleFiles = uploadMultiple
export const fetchMediaLibrary = fetchMedia
export const deleteMediaImage = deleteMedia

export default {
  uploadSingle,
  uploadMultiple,
  fetchMedia,
  deleteMedia,
  fetchStorageStats,
  uploadSingleFile,
  uploadMultipleFiles,
  fetchMediaLibrary,
  deleteMediaImage,
  getAuthToken,
}

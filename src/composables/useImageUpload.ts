// =============================================================
// useImageUpload — Supabase Storage image upload composable
// =============================================================
// Supports: JPEG, PNG, GIF, WebP — max 5 MB input
// Compression: resizes + re-encodes to JPEG/WebP before upload
// Buckets: 'avatars' (users) | 'questions' (question images)
// =============================================================

import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const IMAGE_BUCKETS = {
  AVATARS: 'avatars',
  QUESTIONS: 'questions',
} as const

export type ImageBucket = (typeof IMAGE_BUCKETS)[keyof typeof IMAGE_BUCKETS]

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// ---------------------------------------------------------------------------
// Compression config
// ---------------------------------------------------------------------------
// Avatarlar kichikroq, savollar rasmlari biroz kattaroq bo'lishi mumkin
const COMPRESS_CONFIG: Record<ImageBucket, { maxWidth: number; maxHeight: number; quality: number }> = {
  avatars:   { maxWidth: 400,  maxHeight: 400,  quality: 0.82 },
  questions: { maxWidth: 1200, maxHeight: 1200, quality: 0.85 },
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ImageValidationError {
  type: 'size' | 'type'
  message: string
}

export function validateImageFile(file: File): ImageValidationError | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      type: 'type',
      message: `Faqat JPEG, PNG, GIF va WebP formatlari qabul qilinadi. Siz yuklagan fayl: ${file.type || "noma'lum"}`,
    }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      type: 'size',
      message: `Fayl hajmi 5 MB dan oshmasligi kerak. Siz yuklagan fayl: ${sizeMB} MB`,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Image compression (Canvas API — no external deps)
// ---------------------------------------------------------------------------

/**
 * Compress an image File using the browser Canvas API.
 *
 * Algorithm:
 *   1. Decode the image into an <img> element via createObjectURL.
 *   2. Draw it onto an off-screen <canvas>, scaling down proportionally
 *      so neither dimension exceeds the configured max.
 *   3. Export as JPEG (or WebP if the browser supports it) at the
 *      configured quality level.
 *   4. If the compressed result is somehow LARGER than the original,
 *      return the original file unchanged (safety net).
 *
 * GIF frames are not animated after compression — they become a
 * single static frame.  This is acceptable for avatar/question images.
 *
 * @param file   - Original File chosen by the user
 * @param bucket - Determines max dimensions and quality
 * @returns      - A new File (always JPEG or WebP) ready to upload
 */
async function compressImage(file: File, bucket: ImageBucket): Promise<File> {
  const { maxWidth, maxHeight, quality } = COMPRESS_CONFIG[bucket]

  // Prefer WebP for better compression when the browser supports it;
  // fall back to JPEG (universally supported).
  const outputMime = canEncodeWebP() ? 'image/webp' : 'image/jpeg'
  const outputExt  = outputMime === 'image/webp' ? 'webp' : 'jpg'

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // Calculate scaled dimensions (maintain aspect ratio)
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        // Canvas not available — return original
        resolve(file)
        return
      }

      // Use high-quality downscaling
      ctx.imageSmoothingEnabled  = true
      ctx.imageSmoothingQuality  = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          // Only use compressed version if it's actually smaller
          if (blob.size >= file.size) {
            resolve(file)
            return
          }
          const baseName = file.name.replace(/\.[^.]+$/, '')
          const compressed = new File([blob], `${baseName}.${outputExt}`, {
            type: outputMime,
            lastModified: Date.now(),
          })
          resolve(compressed)
        },
        outputMime,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file) // fallback to original on decode error
    }

    img.src = objectUrl
  })
}

/** Check whether the browser can encode to WebP via canvas.toBlob. */
let _webpSupported: boolean | null = null
function canEncodeWebP(): boolean {
  if (_webpSupported !== null) return _webpSupported
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    _webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    _webpSupported = false
  }
  return _webpSupported
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Extract the storage path from a full Supabase public URL. */
export function extractStoragePath(publicUrl: string, bucket: ImageBucket): string | null {
  try {
    const url    = new URL(publicUrl)
    const marker = `/object/public/${bucket}/`
    const idx    = url.pathname.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(url.pathname.slice(idx + marker.length))
  } catch {
    return null
  }
}

/** Build a unique storage path for a file. */
function buildStoragePath(prefix: string, file: File): string {
  const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const timestamp = Date.now()
  const random    = Math.random().toString(36).slice(2, 8)
  return `${prefix}/${timestamp}-${random}.${ext}`
}

// ---------------------------------------------------------------------------
// Bucket auto-provisioning
// ---------------------------------------------------------------------------

const verifiedBuckets = new Set<string>()

async function ensureBucket(bucket: ImageBucket): Promise<void> {
  if (verifiedBuckets.has(bucket)) return

  try {
    const { data: existing, error: getErr } = await supabase.storage.getBucket(bucket)
    if (existing && !getErr) {
      verifiedBuckets.add(bucket)
      return
    }

    const { error: createErr } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    })

    if (createErr) {
      console.warn(
        `[useImageUpload] Could not auto-create bucket "${bucket}": ${createErr.message}. ` +
        'Please create it manually in Supabase Dashboard → Storage.',
      )
      return
    }

    verifiedBuckets.add(bucket)
  } catch (err) {
    console.warn('[useImageUpload] ensureBucket error (non-fatal):', err)
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useImageUpload() {
  const isUploading  = ref(false)
  const uploadError  = ref<string | null>(null)

  /**
   * Compress + upload a file to Supabase Storage.
   * Returns the public URL on success, null on failure.
   */
  async function uploadImage(
    file: File,
    bucket: ImageBucket,
    pathPrefix: string,
  ): Promise<string | null> {
    uploadError.value = null

    const validationErr = validateImageFile(file)
    if (validationErr) {
      uploadError.value = validationErr.message
      return null
    }

    isUploading.value = true
    try {
      await ensureBucket(bucket)

      // Compress before uploading
      const fileToUpload = await compressImage(file, bucket)
      const storagePath  = buildStoragePath(pathPrefix, fileToUpload)

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileToUpload.type,
        })

      if (uploadErr) {
        uploadError.value = `Rasmni yuklashda xatolik: ${uploadErr.message}`
        return null
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      return data.publicUrl
    } catch (err) {
      uploadError.value = err instanceof Error ? err.message : 'Rasmni yuklashda xatolik'
      return null
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Delete a file from Supabase Storage by its public URL.
   * Returns true on success, false on failure (non-throwing).
   */
  async function deleteImage(publicUrl: string, bucket: ImageBucket): Promise<boolean> {
    if (!publicUrl) return false

    const storagePath = extractStoragePath(publicUrl, bucket)
    if (!storagePath) {
      console.warn('[useImageUpload] deleteImage: could not parse storage path from URL:', publicUrl)
      return false
    }

    try {
      const { error } = await supabase.storage.from(bucket).remove([storagePath])
      if (error) {
        console.warn('[useImageUpload] deleteImage failed:', error.message)
        return false
      }
      return true
    } catch (err) {
      console.warn('[useImageUpload] deleteImage exception:', err)
      return false
    }
  }

  /**
   * Upload a new image and delete the old one atomically from the caller's
   * perspective: new URL is returned first, old file deleted in background.
   */
  async function replaceImage(
    newFile: File,
    oldUrl: string | null | undefined,
    bucket: ImageBucket,
    pathPrefix: string,
  ): Promise<string | null> {
    const newUrl = await uploadImage(newFile, bucket, pathPrefix)
    if (!newUrl) return null

    if (oldUrl) {
      deleteImage(oldUrl, bucket).catch((err) =>
        console.warn('[useImageUpload] Old image cleanup failed (non-fatal):', err),
      )
    }

    return newUrl
  }

  return { isUploading, uploadError, uploadImage, deleteImage, replaceImage }
}

// ---------------------------------------------------------------------------
// Standalone preview helpers (no upload, client-side only)
// ---------------------------------------------------------------------------

export function createLocalPreview(file: File): string {
  return URL.createObjectURL(file)
}

export function revokeLocalPreview(url: string): void {
  URL.revokeObjectURL(url)
}

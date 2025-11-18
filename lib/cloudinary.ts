import { v2 as cloudinary } from 'cloudinary'
import { logInfo, logError } from './logger'

/**
 * Cloudinary media upload service
 * Uploads Twilio media to permanent Cloudinary storage
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  url: string
  secureUrl: string
  publicId: string
  format: string
  width?: number
  height?: number
  bytes: number
}

/**
 * Upload media URL to Cloudinary
 * @param mediaUrl - Twilio media URL (expires after 24h)
 * @param folder - Cloudinary folder (e.g., "watch-photos", "guarantee-cards")
 * @returns Permanent Cloudinary URL
 */
export async function uploadMediaToCloudinary(
  mediaUrl: string,
  folder: string = 'verifications'
): Promise<UploadResult> {
  try {
    logInfo('cloudinary-upload', `Uploading media to Cloudinary`, { folder })

    // Fetch the media from Twilio
    const response = await fetch(mediaUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`)
    }

    // Get the image buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // Auto-detect image, video, or raw
          quality: 'auto:good', // Optimize quality
          fetch_format: 'auto', // Auto-select best format
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )

      uploadStream.end(buffer)
    })

    logInfo('cloudinary-upload', `Successfully uploaded to Cloudinary`, {
      publicId: result.public_id,
      bytes: result.bytes,
    })

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    }
  } catch (error: any) {
    logError('cloudinary-upload', error, { mediaUrl, folder })
    throw error
  }
}

/**
 * Upload verification documents
 * Organized into separate folders for easy management
 */
export async function uploadVerificationDocuments(docs: {
  watchPhotoUrl?: string
  guaranteeCardUrl?: string
  invoiceUrl?: string
}) {
  const results: {
    watchPhoto?: string
    guaranteeCard?: string
    invoice?: string
  } = {}

  try {
    if (docs.watchPhotoUrl) {
      const upload = await uploadMediaToCloudinary(docs.watchPhotoUrl, 'verifications/watch-photos')
      results.watchPhoto = upload.secureUrl
    }

    if (docs.guaranteeCardUrl) {
      const upload = await uploadMediaToCloudinary(docs.guaranteeCardUrl, 'verifications/guarantee-cards')
      results.guaranteeCard = upload.secureUrl
    }

    if (docs.invoiceUrl) {
      const upload = await uploadMediaToCloudinary(docs.invoiceUrl, 'verifications/invoices')
      results.invoice = upload.secureUrl
    }

    return results
  } catch (error: any) {
    logError('verification-documents-upload', error)
    throw error
  }
}

/**
 * Delete media from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteMediaFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
    logInfo('cloudinary-delete', `Deleted media from Cloudinary`, { publicId })
  } catch (error: any) {
    logError('cloudinary-delete', error, { publicId })
    throw error
  }
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

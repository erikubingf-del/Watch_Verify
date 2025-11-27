import { logError, logInfo } from './logger'

/**
 * Check if Cloudinary is properly configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

/**
 * Upload verification documents (multiple images) to Cloudinary
 */
export async function uploadVerificationDocuments(
  mediaUrls: string[],
  sessionId: string
): Promise<string[]> {
  if (!isCloudinaryConfigured()) {
    logInfo('cloudinary-skip', 'Cloudinary not configured, returning original URLs')
    return mediaUrls
  }

  const uploadedUrls: string[] = []

  for (let i = 0; i < mediaUrls.length; i++) {
    try {
      const url = await uploadToCloudinary(mediaUrls[i], `verification/${sessionId}`)
      uploadedUrls.push(url)
    } catch (error: any) {
      logError('cloudinary-doc-upload', error, { sessionId, index: i })
      // Keep original URL if upload fails
      uploadedUrls.push(mediaUrls[i])
    }
  }

  return uploadedUrls
}

/**
 * Upload media to Cloudinary for permanent storage
 */
export async function uploadToCloudinary(twilioMediaUrl: string, folder?: string): Promise<string> {
  try {
    const cloudinary = require('cloudinary').v2

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    // Upload from Twilio URL
    const result = await cloudinary.uploader.upload(twilioMediaUrl, {
      folder: folder || 'watch-verify',
      resource_type: 'auto',
    })

    return result.secure_url
  } catch (error: any) {
    logError('cloudinary-upload', error)
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`)
  }
}

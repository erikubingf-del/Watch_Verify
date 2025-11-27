import { logError } from './logger'

/**
 * Upload media to Cloudinary for permanent storage
 */
export async function uploadToCloudinary(twilioMediaUrl: string): Promise<string> {
  try {
    const cloudinary = require('cloudinary').v2

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    // Upload from Twilio URL
    const result = await cloudinary.uploader.upload(twilioMediaUrl, {
      folder: 'watch-verify',
      resource_type: 'auto',
    })

    return result.secure_url
  } catch (error: any) {
    logError('cloudinary-upload', error)
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`)
  }
}

import { getSupabaseServerClient } from '../ai/supabaseClient.js'
import { permissionService } from './permissionService.js'

const DOCUMENT_BUCKET = 'document'
const MAX_FILE_SIZE = 25 * 1024 * 1024

class AnnouncementImageService {
  async uploadImage({ viewer, announcementId, file }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    if (!file || file.size > MAX_FILE_SIZE) {
      return { status: 400, error: 'File is required and must be under 25 MB.' }
    }

    const hasPermission = permissionService.hasPermission(viewer.permissions || [], 'ANNOUNCEMENT_POST_IMAGE')
    if (!hasPermission) {
      return { status: 403, error: 'You do not have permission to post images in announcements.' }
    }

    const client = getSupabaseServerClient()
    const fileName = `announcement_${announcementId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await client.storage
      .from(DOCUMENT_BUCKET)
      .upload(fileName, file, { upsert: false })

    if (uploadError) {
      return { status: 500, error: 'Failed to upload image.' }
    }

    const { data: publicUrlData } = client.storage
      .from(DOCUMENT_BUCKET)
      .getPublicUrl(fileName)

    const imageUrl = publicUrlData?.publicUrl || null
    if (!imageUrl) {
      return { status: 500, error: 'Failed to get image URL.' }
    }

    const { error: insertError } = await client
      .from('announcement_images')
      .insert({
        announcement_id: announcementId,
        image_url: imageUrl,
      })

    if (insertError) {
      return { status: 500, error: 'Failed to save image record.' }
    }

    return {
      data: {
        announcement_image_id: null,
        announcement_id: announcementId,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      },
    }
  }

  async getImages({ viewer, announcementId }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('announcement_images')
      .select('announcement_image_id, announcement_id, image_url, created_at')
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true })

    if (error) {
      return { status: 500, error: 'Failed to load images.' }
    }

    return { data: data || [] }
  }
}

export const announcementImageService = new AnnouncementImageService()

import { getSupabaseServerClient } from '../ai/supabaseClient.js'
import { permissionService } from './permissionService.js'

const DOCUMENT_BUCKET = 'document'
const MAX_FILE_SIZE = 25 * 1024 * 1024

class MessageImageService {
  async uploadImage({ viewer, emailId, file }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    if (!file || file.size > MAX_FILE_SIZE) {
      return { status: 400, error: 'File is required and must be under 25 MB.' }
    }

    const hasPermission = permissionService.hasPermission(viewer.permissions || [], 'MESSAGE_SEND_IMAGE')
    if (!hasPermission) {
      return { status: 403, error: 'You do not have permission to send images in messages.' }
    }

    const client = getSupabaseServerClient()
    const fileName = `message_${emailId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

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
      .from('email_attachment')
      .insert({
        email_id: emailId,
        file_name: file.name,
        file_type: file.type || 'image',
        file_size: file.size,
        file_path: imageUrl,
      })

    if (insertError) {
      return { status: 500, error: 'Failed to save image record.' }
    }

    return {
      data: {
        email_attachment_id: null,
        email_id: emailId,
        image_url: imageUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      },
    }
  }

  async getImages({ viewer, emailId }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    try {
      const client = getSupabaseServerClient()
      const { data, error } = await client
        .from('email_attachment')
        .select('email_attachment_id, email_id, file_name, file_type, file_size, file_path, created_at')
        .eq('email_id', emailId)
        .order('created_at', { ascending: true })

      if (error) {
        return { status: 500, error: 'Failed to load images.' }
      }

      return {
        data: (data || []).map((row) => ({
          email_attachment_id: row.email_attachment_id,
          email_id: row.email_id,
          image_url: row.file_path,
          file_name: row.file_name,
          file_type: row.file_type,
          file_size: row.file_size,
          created_at: row.created_at,
        })),
      }
    } catch (error) {
      console.error('[messageImageService] getImages failed:', error)
      return { status: 500, error: 'Message image service is currently unavailable.' }
    }
  }

  async deleteImage({ viewer, emailAttachmentId }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const client = getSupabaseServerClient()
    const { data: attachment, error: fetchError } = await client
      .from('email_attachment')
      .select('email_attachment_id, email_id, file_path')
      .eq('email_attachment_id', emailAttachmentId)
      .maybeSingle()

    if (fetchError || !attachment) {
      return { status: 404, error: 'Image not found.' }
    }

    const { error: deleteError } = await client
      .from('email_attachment')
      .delete()
      .eq('email_attachment_id', emailAttachmentId)

    if (deleteError) {
      return { status: 500, error: 'Failed to remove image.' }
    }

    return { data: { success: true } }
  }
}

export const messageImageService = new MessageImageService()

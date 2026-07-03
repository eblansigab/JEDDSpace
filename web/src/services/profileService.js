import { supabaseClient } from '../supabase/supabaseClient'

const AVATARS_BUCKET = 'avatars'
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

const getAvatarStoragePath = (userId) => `${userId}.png`

const generateFallbackAvatar = (text = 'avatar') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#1E0977"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="110" font-family="Inter, sans-serif">
        ${text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()}
      </text>
    </svg>
  `.trim()
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const resizeImageToPng = async (file) => {
  const bitmap = await createImageBitmap(file)
  const size = Math.min(bitmap.width, bitmap.height, 512)
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const sx = (bitmap.width - size) / 2
  const sy = (bitmap.height - size) / 2
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new File([blob], `${Date.now()}-avatar.png`, { type: 'image/png' })
}

export const profileService = {
  async updateAccountDetails(userId, updates) {
    const { data: existing } = await supabaseClient
      .from('employee')
      .select('employee_id, first_name, last_name, department, position')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const updatePayload = {}

      if (updates.first_name?.trim()) {
        updatePayload.first_name = updates.first_name.trim()
      }

      if (updates.last_name?.trim()) {
        updatePayload.last_name = updates.last_name.trim()
      }

      if (updates.department?.trim()) {
        updatePayload.department = updates.department.trim()
      }

      if (updates.position?.trim()) {
        updatePayload.position = updates.position.trim()
      }

      const { data, error } = await supabaseClient
        .from('employee')
        .update(updatePayload)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    const payload = {
      user_id: userId,
      auth_user_id: userId,
      first_name: updates.first_name?.trim() || 'Unknown',
      last_name: updates.last_name?.trim() || 'User',
      department: updates.department?.trim() || 'general',
      position: updates.position?.trim() || 'employee',
    }

    const { data, error } = await supabaseClient
      .from('employee')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getCurrentSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession()
    if (error) throw error
    return session
  },

  async checkServerAccountStatus(userId) {
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employee')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (employeeError) throw employeeError

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError) throw authError

    return {
      employee: employeeData,
      user,
      verifiedAt: new Date().toISOString()
    }
  },

  async updateAuthMetadata(metadataUpdates) {
    const { data, error } = await supabaseClient.auth.updateUser({
      data: metadataUpdates
    })

    if (error) throw error
    return data.user
  },

  async uploadAvatar(file, userId) {
    if (!file) throw new Error('No file provided for avatar upload.')
    if (!userId) throw new Error('Missing user id for avatar upload.')

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new Error('Avatar image must be smaller than 2MB.')
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      throw new Error('Unsupported avatar format. Use PNG, JPG, JPEG, or WEBP.')
    }

    const processedFile = file.type === 'image/png' ? file : await resizeImageToPng(file)
    const path = getAvatarStoragePath(userId)

    const { error: uploadError } = await supabaseClient.storage
      .from(AVATARS_BUCKET)
      .upload(path, processedFile, { upsert: true, contentType: 'image/png' })

    if (uploadError) {
      const message = String(uploadError.message || '')
      if (message.includes('Bucket not found') || message.toLowerCase().includes('bucket')) {
        throw new Error(`Storage bucket "${AVATARS_BUCKET}" not found. Create it in Supabase Storage and make it public, then try again.`)
      }
      throw uploadError
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(path)

    const publicUrl = publicUrlData.publicUrl

    const { data, error } = await supabaseClient
      .from('employee')
      .update({ avatar_url: publicUrl })
      .eq('user_id', userId)
      .select('employee_id, avatar_url')
      .single()

    if (error) throw error

    return { publicUrl, employee: data }
  },

  async removeAvatar(userId) {
    if (!userId) throw new Error('Missing user id for avatar removal.')

    const path = getAvatarStoragePath(userId)

    const { data: employeeData } = await supabaseClient
      .from('employee')
      .select('avatar_url')
      .eq('user_id', userId)
      .maybeSingle()

    const { error: removeError } = await supabaseClient.storage
      .from(AVATARS_BUCKET)
      .remove([path])

    if (removeError) {
      const message = String(removeError.message || '')
      if (message.includes('Bucket not found') || message.toLowerCase().includes('bucket')) {
        throw new Error(`Storage bucket "${AVATARS_BUCKET}" not found. Create it in Supabase Storage and make it public, then try again.`)
      }
      throw removeError
    }

    const { data, error } = await supabaseClient
      .from('employee')
      .update({ avatar_url: null })
      .eq('user_id', userId)
      .select('employee_id, avatar_url')
      .single()

    if (error) throw error

    return { employee: data, previousAvatarUrl: employeeData?.avatar_url || null }
  },

  getInitials(first = '', last = '') {
    const a = String(first || '').trim()[0] || ''
    const b = String(last || '').trim()[0] || ''
    return `${a}${b}`.toUpperCase() || 'U'
  },

  getAvatarUrl(avatarUrl, firstName, lastName) {
    const sanitizedText = [firstName, lastName].filter(Boolean).join(' ') || 'User'
    if (avatarUrl) return avatarUrl
    return generateFallbackAvatar(sanitizedText)
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { sbServer } from '@/lib/supabase-server'
import { sbService } from '@/lib/supabase-service'
import { requireAdmin } from '@/lib/authz'

export type UpdateProfileState = {
    success?: boolean
    error?: string
}

export async function updateProfile(prevState: UpdateProfileState, formData: FormData): Promise<UpdateProfileState> {
    const admin = await requireAdmin()
    const sb = await sbServer()
    const { data: { user } } = await sb.auth.getUser()

    if (!user || user.id !== admin.id) {
        return { error: 'Unauthorized' }
    }

    const fullName = formData.get('fullName') as string
    const avatarUrl = formData.get('avatarUrl') as string
    const studentId = formData.get('studentId') as string
    const email = formData.get('email') as string

    if (!fullName) {
        return { error: 'Full name is required' }
    }

    try {
        // Update profile
        const { error } = await sb
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: fullName,
                avatar_url: avatarUrl || null,
                student_id: studentId || null,
                email: email || null,
            })

        if (error) throw error

        // Update auth metadata AND email (Admin API)
        const serviceClient = sbService()
        const { error: authError } = await serviceClient.auth.admin.updateUserById(user.id, {
            email: email,
            user_metadata: { full_name: fullName, avatar_url: avatarUrl },
            email_confirm: true // Auto-confirm the new email
        })

        if (authError) throw authError

        revalidatePath('/admin', 'layout')
        return { success: true }
    } catch (err) {
        console.error('Profile update error:', err)
        const msg = (err as { message?: string })?.message || 'Failed to update profile'
        return { error: msg }
    }
}

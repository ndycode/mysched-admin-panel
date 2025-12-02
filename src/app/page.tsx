// src/app/page.tsx
import { redirect } from 'next/navigation'
import { sbService } from '@/lib/supabase-service'
import { sbServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const sb = await sbServer()

  const { data } = await sb.auth.getUser()
  const user = data?.user
  if (!user) redirect('/login')

  const svc = sbService()
  const { data: row } = await svc
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) redirect('/login?reason=forbidden')

  redirect('/admin')
}

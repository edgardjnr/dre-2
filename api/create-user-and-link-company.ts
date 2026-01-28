import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' })
    return
  }

  const { email, companyId } = req.body || {}
  if (!email || !companyId) {
    res.status(400).json({ success: false, error: 'Missing email or companyId' })
    return
  }

  try {
    const { data: userData, error: createError } = await admin.auth.admin.createUser({ email })
    if (createError) {
      res.status(400).json({ success: false, error: createError.message })
      return
    }

    const userId = userData.user?.id
    if (!userId) {
      res.status(400).json({ success: false, error: 'User creation failed' })
      return
    }

    const { error: linkError } = await admin.from('company_collaborators').insert({ company_id: companyId, user_id: userId })
    if (linkError) {
      res.status(400).json({ success: false, error: linkError.message })
      return
    }

    res.status(200).json({ success: true, userId })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Server error' })
  }
}

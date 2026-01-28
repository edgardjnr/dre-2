import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' })
    return
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ success: false, error: 'Missing Supabase environment configuration' })
    return
  }

  const { email, companyId } = req.body || {}
  if (!email || !companyId) {
    res.status(400).json({ success: false, error: 'Missing email or companyId' })
    return
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase()

    // Tentar localizar usuário existente por email via admin listUsers
    let userId: string | undefined
    try {
      const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      if (listErr) {
        throw listErr
      }
      userId = usersList.users.find(u => (u.email || '').toLowerCase() === normalizedEmail)?.id
    } catch {
      // Ignorar erro de listUsers, tentaremos criar em seguida
    }

    // Criar usuário se não encontrado
    if (!userId) {
      const tempPassword = randomBytes(32).toString('base64url')
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true
      })
      if (createError) {
        const errMsg = (createError.message || '').toLowerCase()
        // Fallback para casos onde o GoTrue retorna erro genérico de banco
        if (errMsg.includes('database error creating new user')) {
          const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
            redirectTo: `${process.env.APP_URL || 'https://dre.onebots.com.br'}/reset-password`
          })
          if (inviteErr) {
            return res.status(400).json({
              success: false,
              error: inviteErr.message || createError.message,
              details: { primary: createError, fallback: inviteErr }
            })
          }
          const { data: usersList3 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
          userId = usersList3?.users.find(u => (u.email || '').toLowerCase() === normalizedEmail)?.id
          if (!userId) {
            return res.status(400).json({ success: false, error: 'User invite sent but user id not found' })
          }
        }
        // Se o e-mail já existir, tentar localizar novamente com uma listagem maior
        else if (errMsg.includes('already') || errMsg.includes('exists')) {
          const { data: usersList2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
          userId = usersList2?.users.find(u => (u.email || '').toLowerCase() === normalizedEmail)?.id
        } else {
          return res.status(400).json({
            success: false,
            error: createError.message,
            details: createError
          })
        }
      } else {
        userId = created.user?.id
      }
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User creation or lookup failed' })
    }

    // Vincular colaborador (idempotente)
    const { error: linkError } = await admin
      .from('company_collaborators')
      .insert({ company_id: companyId, user_id: userId, role: 'member' }, { onConflict: 'company_id,user_id' })
    if (linkError) {
      // Se conflito por unique, considerar sucesso
      const msg = (linkError.message || '').toLowerCase()
      if (msg.includes('duplicate key') || msg.includes('already')) {
        return res.status(200).json({ success: true, userId })
      }
      return res.status(400).json({ success: false, error: linkError.message })
    }

    res.status(200).json({ success: true, userId })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Server error' })
  }
}

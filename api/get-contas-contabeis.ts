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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ success: false, error: 'Missing Supabase environment configuration' })
    return
  }

  const authHeader = String(req.headers.authorization || '')
  if (!authHeader) {
    res.status(401).json({ success: false, error: 'Missing authorization' })
    return
  }

  const { companyId } = req.body || {}
  if (!companyId) {
    res.status(400).json({ success: false, error: 'Missing companyId' })
    return
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_SERVICE_ROLE_KEY
      }
    })

    if (!userRes.ok) {
      res.status(401).json({ success: false, error: 'Invalid token' })
      return
    }

    const caller = await userRes.json()
    const callerId = caller?.id as string | undefined
    if (!callerId) {
      res.status(401).json({ success: false, error: 'Invalid token' })
      return
    }

    const { data: empresaRow, error: empresaError } = await admin
      .from('empresas')
      .select('id, user_id')
      .eq('id', String(companyId))
      .maybeSingle()

    if (empresaError) {
      res.status(400).json({ success: false, error: empresaError.message })
      return
    }

    if (!empresaRow) {
      res.status(404).json({ success: false, error: 'Company not found' })
      return
    }

    let isMember = empresaRow.user_id === callerId
    if (!isMember) {
      const { data: collabRow, error: collabError } = await admin
        .from('company_collaborators')
        .select('id')
        .eq('company_id', String(companyId))
        .eq('user_id', callerId)
        .maybeSingle()

      if (collabError) {
        res.status(400).json({ success: false, error: collabError.message })
        return
      }

      isMember = Boolean(collabRow)
    }

    if (!isMember) {
      res.status(403).json({ success: false, error: 'Access denied' })
      return
    }

    const selectFull = 'id, user_id, created_at, empresa_id, codigo, nome, categoria, subcategoria, tipo, ativa'
    const selectWithoutSub = 'id, user_id, created_at, empresa_id, codigo, nome, categoria, tipo, ativa'

    const runQuery = async (select: string) => {
      return await admin
        .from('contas_contabeis')
        .select(select)
        .eq('empresa_id', String(companyId))
        .eq('ativa', true)
        .order('codigo', { ascending: true })
    }

    let contasRes = await runQuery(selectFull)
    if (contasRes.error) {
      const msg = String(contasRes.error.message || '')
      const missingSub = /subcategoria/i.test(msg) && /does not exist|unknown column|42703/i.test(msg)
      if (missingSub) {
        contasRes = await runQuery(selectWithoutSub)
      }
    }

    if (contasRes.error) {
      res.status(400).json({ success: false, error: contasRes.error.message })
      return
    }

    res.status(200).json({ success: true, data: contasRes.data || [] })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Server error' })
  }
}

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let instance = null
export async function getBackend() {
  if (instance) return instance
  if (isConfigured) {
    const { createSupabaseBackend } = await import('./supabaseBackend.js')
    instance = createSupabaseBackend(SUPABASE_URL, SUPABASE_ANON_KEY)
  } else {
    const { createDemoBackend } = await import('./demoBackend.js')
    instance = await createDemoBackend()
  }
  return instance
}

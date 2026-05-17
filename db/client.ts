import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Singleton pattern: evita criar múltiplos pools em hot-reloads do Next.js dev
const globalForDb = globalThis as unknown as { _pgClient?: ReturnType<typeof postgres> }

const client = globalForDb._pgClient ?? postgres(process.env.DATABASE_URL!, {
  prepare: false,  // obrigatorio para Supabase PgBouncer
  max: 3,          // limite conservador — PgBouncer multiplexeia
})

if (process.env.NODE_ENV !== 'production') {
  globalForDb._pgClient = client
}

export const db = drizzle(client, { schema })

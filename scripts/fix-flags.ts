import 'dotenv/config'
import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { inArray } from 'drizzle-orm'

async function main() {
  await db.update(macroSeriesMeta).set({ active: true })
    .where(inArray(macroSeriesMeta.sourceCode, ['16121']))

  await db.update(macroSeriesMeta).set({ active: false })
    .where(inArray(macroSeriesMeta.sourceCode, ['432', '20402', '22689']))

  console.log('Flags atualizados: 16121 ativo, 432/20402/22689 inativos')
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })

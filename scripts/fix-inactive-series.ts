/**
 * Testa séries com erros frequentes e marca como inativas as que retornam 404.
 * Roda uma vez para limpar o catálogo.
 */
import { db } from '../db/client'
import { macroSeriesMeta } from '../db/schema'
import { eq } from 'drizzle-orm'

const TO_CHECK = [
  '22099', '19882', '22109', '22110', '22113', '22115',
  '1411',  '1412',  '1413',  '1416',  '1408',  '1409',
  '22096', '22097', '22103', '22111', '22114',
]

async function probe(code: string): Promise<boolean> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=01/01/2025&dataFinal=01/05/2026`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    return res.ok
  } catch { return false }
}

async function main() {
  for (const code of TO_CHECK) {
    process.stdout.write(`  ${code}… `)
    const ok = await probe(code)
    if (!ok) {
      await db.update(macroSeriesMeta).set({ active: false }).where(eq(macroSeriesMeta.sourceCode, code))
      console.log('404 → marcada inativa')
    } else {
      console.log('OK')
    }
  }
  console.log('\nPronto.')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })

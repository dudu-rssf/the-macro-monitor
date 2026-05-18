import { NextResponse } from 'next/server'
import { fetchNegociosNews } from '@/lib/rss'

export const revalidate = 900

export async function GET() {
  try {
    const news = await fetchNegociosNews()
    return NextResponse.json(news)
  } catch {
    return NextResponse.json([])
  }
}

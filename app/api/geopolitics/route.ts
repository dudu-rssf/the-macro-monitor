import { NextResponse } from 'next/server'
import { fetchGeopoliticsNews } from '@/lib/rss'

export const revalidate = 900

export async function GET() {
  try {
    const news = await fetchGeopoliticsNews()
    return NextResponse.json(news)
  } catch {
    return NextResponse.json([])
  }
}

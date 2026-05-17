import { NextResponse } from 'next/server'
import { fetchAllNews } from '@/lib/rss'

export const revalidate = 900 // 15 minutos

export async function GET() {
  try {
    const news = await fetchAllNews()
    return NextResponse.json(news)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

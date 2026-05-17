import { TopNav } from './_components/top-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopNav />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}

import { OverviewDashboard } from './_components/overview-dashboard'
import { TabAiSummary } from '@/components/macro/tab-ai-summary'

export default function HomePage() {
  return (
    <>
      <OverviewDashboard />
      <TabAiSummary tab="visao" />
    </>
  )
}

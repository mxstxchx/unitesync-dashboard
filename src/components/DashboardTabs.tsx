import { TabType } from '@/app/page'

interface DashboardTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs = [
  { id: 'general' as TabType, name: 'General', description: 'Business intelligence & client insights' },
  { id: 'email' as TabType, name: 'Email Outreach', description: 'Campaigns & A/B testing' },
  { id: 'inbound' as TabType, name: 'Inbound Audits', description: 'Platform requests & analytics' },
  { id: 'instagram' as TabType, name: 'Instagram Outreach', description: 'Convrt campaigns & performance' },
  { id: 'unattributed' as TabType, name: 'Unattributed', description: 'Unknown source analysis' },
]

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-6 text-center font-medium focus:z-10 focus:outline-none
              ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-black hover:text-black border-b-2 border-transparent hover:border-gray-300'
              }
            `}
          >
            <div className="text-sm font-medium text-black">{tab.name}</div>
            <div className="text-xs text-black mt-1">{tab.description}</div>
          </button>
        ))}
      </nav>
    </div>
  )
}
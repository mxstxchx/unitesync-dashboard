import { KPICard } from '@/components/ui/KPICard'

interface PipelineDistributionProps {
  data?: {
    emailOutreach: { clients: number; revenue: number; percentage: number }
    instagramOutreach: { clients: number; revenue: number; percentage: number }
    royaltyAudit: { clients: number; revenue: number; percentage: number }
    unattributed: { clients: number; revenue: number; percentage: number }
  }
}

export function PipelineDistribution({ data }: PipelineDistributionProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-black mb-4">Pipeline Distribution</h3>
        <div className="text-center py-8">
          <p className="text-black">No pipeline data available</p>
          <p className="text-sm text-black mt-2">Upload data to see distribution</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-medium text-black mb-4">Pipeline Distribution</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Email Outreach"
          value={`${data.emailOutreach.clients}`}
          description={`${data.emailOutreach.percentage.toFixed(1)}% of clients`}
        />
        <KPICard
          title="Instagram Outreach"
          value={`${data.instagramOutreach.clients}`}
          description={`${data.instagramOutreach.percentage.toFixed(1)}% of clients`}
        />
        <KPICard
          title="Royalty Audit"
          value={`${data.royaltyAudit.clients}`}
          description={`${data.royaltyAudit.percentage.toFixed(1)}% of clients`}
        />
        <KPICard
          title="Unattributed"
          value={`${data.unattributed.clients}`}
          description={`${data.unattributed.percentage.toFixed(1)}% of clients`}
        />
      </div>
      
      <div className="mt-6">
        <h4 className="text-sm font-medium text-black mb-3">Revenue by Pipeline</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium text-black">Email Outreach</p>
            <p className="text-lg font-semibold text-black">${data.emailOutreach.revenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium text-black">Instagram Outreach</p>
            <p className="text-lg font-semibold text-black">${data.instagramOutreach.revenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium text-black">Royalty Audit</p>
            <p className="text-lg font-semibold text-black">${data.royaltyAudit.revenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium text-black">Unattributed</p>
            <p className="text-lg font-semibold text-black">${data.unattributed.revenue.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
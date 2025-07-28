import { KPICard } from '@/components/ui/KPICard'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface RevenueAnalyticsProps {
  data?: {
    totalRevenue: number
    monthlyRevenue: number
    averageClientValue: number
    revenueGrowth: number
  }
  pipelineData?: {
    emailOutreach: { clients: number; revenue: number; percentage: number }
    instagramOutreach: { clients: number; revenue: number; percentage: number }
    royaltyAudit: { clients: number; revenue: number; percentage: number }
    unattributed: { clients: number; revenue: number; percentage: number }
  }
  expectedRevenueData?: Array<{
    pipeline: string
    actual_revenue: number
    total_expected: number
    top3_expected: number
    count: number
  }>
}

export function RevenueAnalytics({ data, pipelineData, expectedRevenueData }: RevenueAnalyticsProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-black mb-4">Revenue Analytics</h3>
        <div className="text-center py-8">
          <p className="text-black">No revenue data available</p>
          <p className="text-sm text-black mt-2">Upload data to see analytics</p>
        </div>
      </div>
    )
  }

  // Prepare dual-perspective data for visualization
  const pipelineRevenueData = pipelineData ? [
    { name: 'Email Outreach', revenue: pipelineData.emailOutreach.revenue, clients: pipelineData.emailOutreach.clients },
    { name: 'Instagram Outreach', revenue: pipelineData.instagramOutreach.revenue, clients: pipelineData.instagramOutreach.clients },
    { name: 'Royalty Audit', revenue: pipelineData.royaltyAudit.revenue, clients: pipelineData.royaltyAudit.clients },
    { name: 'Unattributed', revenue: pipelineData.unattributed.revenue, clients: pipelineData.unattributed.clients }
  ].filter(item => item.revenue > 0 || item.clients > 0) : []

  const pieColors = ['#3B82F6', '#E91E63', '#10B981', '#F59E0B']

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-medium text-black mb-4">Revenue Analytics: Dual Perspective</h3>
      
      {/* Original KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <KPICard
          title="Total Revenue"
          value={`$${data.totalRevenue.toLocaleString()}`}
          description="All-time revenue (Active clients)"
          trend={{
            value: data.revenueGrowth,
            isPositive: data.revenueGrowth > 0
          }}
        />
        <KPICard
          title="Average Client Value"
          value={`$${data.averageClientValue.toLocaleString()}`}
          description="Revenue per active client"
        />
      </div>

      {/* Dual-Perspective Expected vs Actual Revenue Analysis */}
      {expectedRevenueData && expectedRevenueData.length > 0 && (
        <div className="space-y-6">
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-black mb-4">Pipeline Revenue Distribution: Dual Perspective</h4>
            <p className="text-sm text-black mb-6">
              Compare expected revenue potential vs actual performance across pipelines
            </p>
            
            {/* Expected vs Actual Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Total Expected vs Actual */}
              <div>
                <h5 className="text-sm font-medium text-black mb-3">
                  Total Expected vs Actual Revenue
                  <span className="text-xs text-black block mt-1">Based on total report estimations</span>
                </h5>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={expectedRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pipeline" tick={{ fontSize: 10, fill: "#000000" }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 10, fill: "#000000" }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString()}`, 
                        name === 'total_expected' ? 'Total Expected' : 'Actual Revenue'
                      ]}
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} 
                      labelStyle={{ color: "#000000" }} 
                      itemStyle={{ color: "#000000" }}
                    />
                    <Bar dataKey="total_expected" name="total_expected" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="actual_revenue" name="actual_revenue" fill="#10B981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top3 Expected vs Actual */}
              <div>
                <h5 className="text-sm font-medium text-black mb-3">
                  Top3 Composers vs Actual Revenue
                  <span className="text-xs text-black block mt-1">Based on top 3 composers estimations</span>
                </h5>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={expectedRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pipeline" tick={{ fontSize: 10, fill: "#000000" }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 10, fill: "#000000" }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString()}`, 
                        name === 'top3_expected' ? 'Top3 Expected' : 'Actual Revenue'
                      ]}
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} 
                      labelStyle={{ color: "#000000" }} 
                      itemStyle={{ color: "#000000" }}
                    />
                    <Bar dataKey="top3_expected" name="top3_expected" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="actual_revenue" name="actual_revenue" fill="#10B981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Efficiency Cards */}
            <div className="mb-6">
              <h5 className="text-sm font-medium text-black mb-3">Performance Efficiency by Pipeline</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {expectedRevenueData.map((pipeline, index) => {
                  const totalEfficiency = pipeline.total_expected > 0 ? (pipeline.actual_revenue / pipeline.total_expected) * 100 : 0
                  const top3Efficiency = pipeline.top3_expected > 0 ? (pipeline.actual_revenue / pipeline.top3_expected) * 100 : 0
                  
                  return (
                    <div key={pipeline.pipeline} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-black mb-2">{pipeline.pipeline}</div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-lg font-semibold text-blue-600">
                            {totalEfficiency.toFixed(1)}%
                          </div>
                          <div className="text-xs text-black">vs Total Expected</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-purple-600">
                            {top3Efficiency.toFixed(1)}%
                          </div>
                          <div className="text-xs text-black">vs Top3 Expected</div>
                        </div>
                        <div className="text-xs text-black mt-2 pt-2 border-t border-gray-200">
                          {pipeline.count} clients • ${pipeline.actual_revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary Legend */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-black mb-2">Understanding the Dual Perspective</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-black">
                <div>
                  <span className="font-medium text-blue-600">Total Expected Revenue:</span> Based on total report estimations from all revenue sources and ranges provided in the original lead data.
                </div>
                <div>
                  <span className="font-medium text-purple-600">Top3 Composers Expected:</span> Based on conservative estimates from the top 3 highest-performing composers/tracks only.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
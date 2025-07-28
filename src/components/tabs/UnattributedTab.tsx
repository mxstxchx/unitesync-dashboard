'use client'

import { useEffect, useState } from 'react'
import { workerDataService, UnattributedKPIs } from '@/services/workerDataService'
import { ensureWorkerDataLoaded } from '@/utils/loadWorkerData'
import { KPICard } from '@/components/ui/KPICard'
import { DataUpdateNotification } from '@/components/ui/DataUpdateNotification'
import { DataTimestamp } from '@/components/ui/DataTimestamp'
import { PipelineTimeSeriesChart } from '@/components/charts/PipelineTimeSeriesChart'

export function UnattributedTab() {
  const [kpis, setKpis] = useState<UnattributedKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUnattributedKPIs()
  }, [])

  const handleDataRefresh = async () => {
    console.log('🔄 Unattributed tab refreshing data...')
    await fetchUnattributedKPIs()
  }

  const fetchUnattributedKPIs = async () => {
    try {
      setLoading(true)
      
      // Ensure worker data is loaded
      await ensureWorkerDataLoaded()

      // Get KPIs from worker data service
      const workerKPIs = workerDataService.getUnattributedKPIs()
      setKpis(workerKPIs)
      
    } catch (error) {
      console.error('Error fetching unattributed KPIs:', error)
      setError(error instanceof Error ? error.message : 'Failed to load unattributed KPIs')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-700">{error}</div>
      </div>
    )
  }

  if (!kpis) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-black">Unattributed Leads Analysis</h2>
        <p className="mt-1 text-sm text-black">
          Analysis of leads without clear attribution source (All clients)
        </p>
        <DataTimestamp className="mt-2" />
      </div>

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KPICard
          title="Unattributed Clients"
          value={kpis.totalUnattributedClients.toLocaleString()}
          description="Clients without pipeline attribution"
          trend={{ value: 0, isPositive: false }}
        />
        <KPICard
          title="Unattributed Revenue"
          value={`$${kpis.totalUnattributedRevenue.toLocaleString()}`}
          description="Revenue from unattributed clients"
          trend={{ value: 0, isPositive: false }}
        />
        <KPICard
          title="Avg Revenue (Unattributed)"
          value={`$${kpis.avgRevenuePerUnattributed.toFixed(0)}`}
          description="Average revenue per unattributed client"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Unattributed Percentage"
          value={`${kpis.unattributedPercentage.toFixed(1)}%`}
          description="Percentage of all clients"
          trend={{ value: 0, isPositive: false }}
        />
        <KPICard
          title="No Contact Attribution"
          value={kpis.clientsWithoutContactAttribution.toLocaleString()}
          description="Clients without contact links"
          trend={{ value: 0, isPositive: false }}
        />
        <KPICard
          title="Revenue (No Contact Attribution)"
          value={`$${kpis.revenueWithoutContactAttribution.toLocaleString()}`}
          description="Revenue without contact attribution"
          trend={{ value: 0, isPositive: false }}
        />
        <KPICard
          title="Potential Recovery"
          value={kpis.potentialAttributionRecovery.toLocaleString()}
          description="Clients with pipeline but no contact attribution"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Attribution Gap Analysis */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-black mb-6">Attribution Gap Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Pipeline Attribution Gap</h4>
              <p className="text-2xl font-bold text-red-700 mb-2">{kpis.totalUnattributedClients}</p>
              <p className="text-sm text-red-600 mb-2">clients without pipeline attribution</p>
              <p className="text-xs text-red-500">
                ${kpis.totalUnattributedRevenue.toLocaleString()} unattributed revenue
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Contact Attribution Gap</h4>
              <p className="text-2xl font-bold text-yellow-700 mb-2">{kpis.clientsWithoutContactAttribution}</p>
              <p className="text-sm text-yellow-600 mb-2">clients without contact attribution</p>
              <p className="text-xs text-yellow-500">
                ${kpis.revenueWithoutContactAttribution.toLocaleString()} revenue without contact links
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Opportunities */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-black mb-4">Improvement Opportunities</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-black">Total Attribution Gap:</span>
              <span className="text-sm font-medium text-black">
                {kpis.unattributedPercentage.toFixed(1)}% of clients lack pipeline attribution
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-black">Revenue Impact:</span>
              <span className="text-sm font-medium text-black">
                ${kpis.totalUnattributedRevenue.toLocaleString()} revenue at risk without attribution
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-black">Recovery Potential:</span>
              <span className="text-sm font-medium text-black">
                {kpis.potentialAttributionRecovery} clients could be linked to contacts
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-black">Contact Attribution Coverage:</span>
              <span className="text-sm font-medium text-black">
                {(100 - (kpis.clientsWithoutContactAttribution / (kpis.clientsWithoutContactAttribution + 230)) * 100).toFixed(1)}% of clients have contact attribution
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Recommended Actions</h3>
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <span className="text-blue-700 font-medium">1.</span>
            <span className="text-blue-800 text-sm">
              Investigate {kpis.totalUnattributedClients} unattributed clients to identify potential pipeline sources
            </span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-700 font-medium">2.</span>
            <span className="text-blue-800 text-sm">
              Implement additional contact attribution methods for {kpis.potentialAttributionRecovery} clients with pipeline attribution
            </span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-700 font-medium">3.</span>
            <span className="text-blue-800 text-sm">
              Review attribution methodology to capture ${kpis.totalUnattributedRevenue.toLocaleString()} unattributed revenue
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Time Series Analysis */}
      <PipelineTimeSeriesChart 
        pipeline="Unattributed"
        title="Unattributed Client Signup Trends"
        color="#8B5CF6"
        showCumulative={true}
      />

      {/* Data Update Notification */}
      <DataUpdateNotification onRefresh={handleDataRefresh} />
    </div>
  )
}
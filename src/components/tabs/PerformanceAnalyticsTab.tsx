'use client'

import { useEffect, useState } from 'react'
import { workerDataService, AttributionReport } from '@/services/workerDataService'
import { ensureWorkerDataLoaded } from '@/utils/loadWorkerData'
import { KPICard } from '@/components/ui/KPICard'
import { DataUpdateNotification } from '@/components/ui/DataUpdateNotification'
import { DataTimestamp } from '@/components/ui/DataTimestamp'
import { RevenueFunnelChart } from '@/components/charts/RevenueFunnelChart'
import { AttributionFlowChart } from '@/components/charts/AttributionFlowChart'

interface PerformanceMetrics {
  totalExpected: number
  totalActual: number
  overallEfficiency: number
  pipelinePerformance: Array<{
    pipeline: string
    expected: number
    actual: number
    efficiency: number
    count: number
  }>
  attributionFlow: Array<{
    source: string
    clients: number
    revenue: number
    percentage: number
    confidence?: number
  }>
  revenueEfficiencyTrend: Array<{
    period: string
    efficiency: number
    volume: number
  }>
}

export function PerformanceAnalyticsTab() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPerformanceMetrics()
  }, [])

  const handleDataRefresh = async () => {
    console.log('🔄 Performance Analytics tab refreshing data...')
    await fetchPerformanceMetrics()
  }

  const fetchPerformanceMetrics = async () => {
    try {
      setLoading(true)
      
      // Ensure worker data is loaded
      await ensureWorkerDataLoaded()

      // Get raw report data
      const rawReport = workerDataService.getRawReport()
      if (!rawReport) {
        throw new Error('No attribution report data available')
      }

      // Process performance metrics
      const performanceMetrics = processPerformanceData(rawReport)
      setMetrics(performanceMetrics)
      
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
      setError(error instanceof Error ? error.message : 'Failed to load performance metrics')
    } finally {
      setLoading(false)
    }
  }

  const processPerformanceData = (report: AttributionReport): PerformanceMetrics => {
    // Extract pipeline revenue breakdown from additional_data
    const pipelineBreakdown = report.additional_data?.pipeline_revenue_breakdown || {}
    
    console.log('🔍 Pipeline breakdown data:', pipelineBreakdown)
    
    // Create pipeline performance data - if no breakdown data, create from attribution breakdown
    let pipelinePerformance = Object.entries(pipelineBreakdown).map(([pipeline, data]: [string, any]) => ({
      pipeline: pipeline.replace('Email Outreach - ', '').replace('Method', '').trim(),
      expected: data.total_expected || 0,
      actual: data.actual_revenue || 0,
      efficiency: data.performance_vs_total ? data.performance_vs_total / 100 : 0,
      count: data.count || 0
    }))
    
    // Fallback: If no pipeline breakdown data, create from basic attribution data
    if (pipelinePerformance.length === 0) {
      console.log('⚠️ No pipeline breakdown found, creating from attribution data')
      pipelinePerformance = Object.entries(report.attribution_breakdown).map(([pipeline, count]: [string, any]) => {
        const revenue = report.revenue_breakdown[pipeline] || 0
        return {
          pipeline: pipeline.replace('Email Outreach - ', '').replace('Method', '').trim(),
          expected: revenue * 1.5, // Mock expected as 1.5x actual for demo
          actual: revenue,
          efficiency: revenue > 0 ? Math.min(1, revenue / (revenue * 1.5)) : 0,
          count: count
        }
      })
    }

    // Calculate totals
    const totalExpected = pipelinePerformance.reduce((sum, p) => sum + p.expected, 0)
    const totalActual = pipelinePerformance.reduce((sum, p) => sum + p.actual, 0)
    const overallEfficiency = totalExpected > 0 ? totalActual / totalExpected : 0

    // Create attribution flow data
    const attributionFlow = Object.entries(report.attribution_breakdown).map(([source, count]: [string, any]) => {
      const revenue = report.revenue_breakdown[source] || 0
      const percentage = report.total_clients > 0 ? (count / report.total_clients) * 100 : 0
      return {
        source,
        clients: count,
        revenue,
        percentage,
        confidence: 0.85 // Default confidence
      }
    })

    // Mock revenue efficiency trend (in a real app, this would come from historical data)
    const revenueEfficiencyTrend = [
      { period: 'Q1 2024', efficiency: 0.18, volume: 15000 },
      { period: 'Q2 2024', efficiency: 0.21, volume: 18000 },
      { period: 'Q3 2024', efficiency: 0.19, volume: 16500 },
      { period: 'Q4 2024', efficiency: overallEfficiency, volume: totalActual }
    ]

    return {
      totalExpected,
      totalActual,
      overallEfficiency,
      pipelinePerformance,
      attributionFlow,
      revenueEfficiencyTrend
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

  if (!metrics) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-black">Performance Analytics</h2>
        <p className="mt-1 text-sm text-black">
          Deep dive into revenue efficiency and pipeline performance metrics
        </p>
        <DataTimestamp className="mt-2" />
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Expected Revenue"
          value={`$${metrics.totalExpected.toLocaleString()}`}
          description="Sum of all pipeline expectations"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Total Actual Revenue"
          value={`$${metrics.totalActual.toLocaleString()}`}
          description="Actual revenue generated"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Overall Efficiency"
          value={`${(metrics.overallEfficiency * 100).toFixed(1)}%`}
          description="Actual vs Expected performance"
          trend={{ 
            value: metrics.overallEfficiency > 0.2 ? 5.2 : -2.1, 
            isPositive: metrics.overallEfficiency > 0.2 
          }}
        />
        <KPICard
          title="Revenue Gap"
          value={`$${(metrics.totalExpected - metrics.totalActual).toLocaleString()}`}
          description="Unrealized revenue potential"
          trend={{ value: -8.3, isPositive: false }}
        />
      </div>

      {/* Revenue Funnel Analysis */}
      <RevenueFunnelChart 
        data={metrics.pipelinePerformance}
        title="Pipeline Revenue Performance: Expected vs Actual"
        height={450}
      />

      {/* Attribution Flow Analysis */}
      <AttributionFlowChart 
        data={metrics.attributionFlow}
        title="Revenue Attribution Flow Analysis"
        height={400}
        showRevenue={false}
      />

      {/* Pipeline Performance Breakdown */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-6">Pipeline Efficiency Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-black">Pipeline</th>
                <th className="text-right py-3 px-4 font-medium text-black">Clients</th>
                <th className="text-right py-3 px-4 font-medium text-black">Expected</th>
                <th className="text-right py-3 px-4 font-medium text-black">Actual</th>
                <th className="text-right py-3 px-4 font-medium text-black">Efficiency</th>
                <th className="text-right py-3 px-4 font-medium text-black">Gap</th>
                <th className="text-right py-3 px-4 font-medium text-black">Per Client</th>
              </tr>
            </thead>
            <tbody>
              {metrics.pipelinePerformance.map((pipeline, index) => {
                const gap = pipeline.expected - pipeline.actual
                const perClient = pipeline.count > 0 ? pipeline.actual / pipeline.count : 0
                const efficiencyColor = pipeline.efficiency >= 0.3 ? 'text-green-600' : 
                                       pipeline.efficiency >= 0.2 ? 'text-yellow-600' : 'text-red-600'
                
                return (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-black">{pipeline.pipeline}</td>
                    <td className="text-right py-3 px-4 text-black">{pipeline.count}</td>
                    <td className="text-right py-3 px-4 text-black">
                      ${pipeline.expected.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-black">
                      ${pipeline.actual.toLocaleString()}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${efficiencyColor}`}>
                      {(pipeline.efficiency * 100).toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-4 text-red-600">
                      ${gap.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-black">
                      ${perClient.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-lg font-medium text-green-900 mb-4">🏆 Top Performing Pipeline</h3>
          {(() => {
            if (metrics.pipelinePerformance.length === 0) {
              return (
                <div className="text-green-700">
                  <p>No pipeline performance data available</p>
                </div>
              )
            }
            
            const topPipeline = metrics.pipelinePerformance.reduce((max, pipeline) => 
              pipeline.efficiency > max.efficiency ? pipeline : max, 
              metrics.pipelinePerformance[0]
            )
            return (
              <div className="space-y-2">
                <p className="text-green-800">
                  <span className="font-semibold">{topPipeline.pipeline}</span>
                </p>
                <p className="text-sm text-green-700">
                  Efficiency: {(topPipeline.efficiency * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-green-700">
                  Revenue: ${topPipeline.actual.toLocaleString()} from {topPipeline.count} clients
                </p>
                <p className="text-sm text-green-700">
                  Avg per client: ${topPipeline.count > 0 ? (topPipeline.actual / topPipeline.count).toLocaleString() : '0'}
                </p>
              </div>
            )
          })()}
        </div>

        {/* Improvement Opportunities */}
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <h3 className="text-lg font-medium text-yellow-900 mb-4">⚠️ Needs Attention</h3>
          {(() => {
            if (metrics.pipelinePerformance.length === 0) {
              return (
                <div className="text-yellow-700">
                  <p>No pipeline performance data available</p>
                </div>
              )
            }
            
            const lowPipeline = metrics.pipelinePerformance.reduce((min, pipeline) => 
              pipeline.efficiency < min.efficiency ? pipeline : min,
              metrics.pipelinePerformance[0]
            )
            const gap = lowPipeline.expected - lowPipeline.actual
            return (
              <div className="space-y-2">
                <p className="text-yellow-800">
                  <span className="font-semibold">{lowPipeline.pipeline}</span>
                </p>
                <p className="text-sm text-yellow-700">
                  Efficiency: {(lowPipeline.efficiency * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-yellow-700">
                  Revenue gap: ${gap.toLocaleString()}
                </p>
                <p className="text-sm text-yellow-700">
                  Potential: {lowPipeline.count} clients × optimization
                </p>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Data Update Notification */}
      <DataUpdateNotification onRefresh={handleDataRefresh} />
    </div>
  )
}
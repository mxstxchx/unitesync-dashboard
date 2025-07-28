'use client'

import { useEffect, useState } from 'react'
import { workerDataService, GeneralKPIs, AttributionReport } from '@/services/workerDataService'
import { ensureWorkerDataLoaded } from '@/utils/loadWorkerData'
import { KPICard } from '@/components/ui/KPICard'
import { RevenueAnalytics } from '@/components/analytics/RevenueAnalytics'
import { PipelineDistribution } from '@/components/analytics/PipelineDistribution'
import { RevenueFunnelChart } from '@/components/charts/RevenueFunnelChart'
import { AttributionFlowChart } from '@/components/charts/AttributionFlowChart'
import { DataUpdateNotification } from '@/components/ui/DataUpdateNotification'
import { DataTimestamp } from '@/components/ui/DataTimestamp'
import { DownloadReportButton } from '@/components/ui/DownloadReportButton'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

export function GeneralTab() {
  const [kpis, setKpis] = useState<GeneralKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revenueData, setRevenueData] = useState<any>(null)
  const [pipelineData, setPipelineData] = useState<any>(null)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [expectedRevenueData, setExpectedRevenueData] = useState<any>(null)
  const [attributionFlowData, setAttributionFlowData] = useState<any>(null)
  const [clientInsightsData, setClientInsightsData] = useState<any>(null)
  const [currentHighValuePage, setCurrentHighValuePage] = useState(0)
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null)
  const [timeSeriesGranularity, setTimeSeriesGranularity] = useState<'week' | 'month' | 'quarter'>('month')

  useEffect(() => {
    fetchGeneralKPIs()
  }, [])

  // Reload time series data when granularity changes
  useEffect(() => {
    if (timeSeriesData) {
      try {
        const timeSeriesAnalysis = workerDataService.getTimeSeriesSignupData(timeSeriesGranularity)
        setTimeSeriesData(timeSeriesAnalysis)
      } catch (error) {
        console.warn('⚠️ Could not reload time series data:', error)
      }
    }
  }, [timeSeriesGranularity])

  const handleDataRefresh = async () => {
    console.log('🔄 General tab refreshing data...')
    await fetchGeneralKPIs()
  }

  const fetchGeneralKPIs = async () => {
    try {
      setLoading(true)
      
      // Force reload fresh data from storage (don't use cached data)
      try {
        await workerDataService.loadFromLocalStorage()
        console.log('✅ Fresh data loaded for GeneralTab')
      } catch (error) {
        console.log('⚠️ Loading from localStorage failed, trying file system...')
        await workerDataService.loadFromFileSystem()
      }

      // Get KPIs from worker data service
      const workerKPIs = workerDataService.getGeneralKPIs()
      setKpis(workerKPIs)

      // Get analytics data for charts
      const revenueBreakdown = workerDataService.getRevenueBreakdown()
      const attributionBreakdown = workerDataService.getAttributionBreakdown()

      // Prepare revenue analytics data
      setRevenueData({
        totalRevenue: workerKPIs.totalRevenue,
        monthlyRevenue: Math.round(workerKPIs.totalRevenue / 12), // Estimated monthly
        averageClientValue: workerKPIs.avgDealAmount,
        revenueGrowth: 0 // No historical data available
      })

      // Prepare pipeline distribution data
      const activeClientsCount = workerKPIs.activeClients
      setPipelineData({
        emailOutreach: {
          clients: (attributionBreakdown['Email Outreach - Old Method'] || 0) + (attributionBreakdown['Email Outreach - New Method'] || 0),
          revenue: (revenueBreakdown['Email Outreach - Old Method'] || 0) + (revenueBreakdown['Email Outreach - New Method'] || 0),
          percentage: activeClientsCount > 0 ? (((attributionBreakdown['Email Outreach - Old Method'] || 0) + (attributionBreakdown['Email Outreach - New Method'] || 0)) / activeClientsCount) * 100 : 0
        },
        instagramOutreach: {
          clients: attributionBreakdown['Instagram Outreach'] || 0,
          revenue: revenueBreakdown['Instagram Outreach'] || 0,
          percentage: activeClientsCount > 0 ? ((attributionBreakdown['Instagram Outreach'] || 0) / activeClientsCount) * 100 : 0
        },
        royaltyAudit: {
          clients: attributionBreakdown['Royalty Audit'] || 0,
          revenue: revenueBreakdown['Royalty Audit'] || 0,
          percentage: activeClientsCount > 0 ? ((attributionBreakdown['Royalty Audit'] || 0) / activeClientsCount) * 100 : 0
        },
        unattributed: {
          clients: attributionBreakdown['Unattributed'] || 0,
          revenue: revenueBreakdown['Unattributed'] || 0,
          percentage: activeClientsCount > 0 ? ((attributionBreakdown['Unattributed'] || 0) / activeClientsCount) * 100 : 0
        }
      })

      // Prepare performance analytics data
      const rawReport = workerDataService.getRawReport()
      if (rawReport?.additional_data?.pipeline_revenue_breakdown) {
        const pipelineBreakdown = rawReport.additional_data.pipeline_revenue_breakdown
        const performanceMetrics = Object.entries(pipelineBreakdown).map(([pipeline, data]: [string, any]) => ({
          pipeline: pipeline.replace('Email Outreach - ', '').replace('Method', '').trim(),
          expected: data.total_expected || 0,
          actual: data.actual_revenue || 0,
          efficiency: data.performance_vs_total ? data.performance_vs_total / 100 : 0,
          count: data.count || 0
        }))
        
        setPerformanceData(performanceMetrics)

        // Prepare expected revenue data for dual perspective analysis
        const expectedRevenueMetrics = Object.entries(pipelineBreakdown).map(([pipeline, data]: [string, any]) => ({
          pipeline: pipeline.replace('Email Outreach - ', '').replace('Method', '').trim(),
          actual_revenue: data.actual_revenue || 0,
          total_expected: data.total_expected || 0,
          top3_expected: data.top3_expected || 0,
          count: data.count || 0
        })).filter(item => item.count > 0) // Only show pipelines with clients
        
        setExpectedRevenueData(expectedRevenueMetrics)
      } else {
        // Fallback: Create performance data from basic attribution data with realistic efficiency calculations
        const fallbackPerformanceData = Object.entries(attributionBreakdown).map(([pipeline, count]: [string, any]) => {
          const revenue = revenueBreakdown[pipeline] || 0
          // Create more realistic expected values based on pipeline type and client count
          let expectedMultiplier = 1.2 // Base multiplier
          if (pipeline.includes('Email Outreach')) expectedMultiplier = 1.8
          if (pipeline.includes('Instagram')) expectedMultiplier = 1.4
          if (pipeline.includes('Royalty Audit')) expectedMultiplier = 1.6
          
          const expected = count > 0 ? (revenue / count) * count * expectedMultiplier : revenue * expectedMultiplier
          const efficiency = expected > 0 ? Math.min(1, revenue / expected) : 0
          
          return {
            pipeline: pipeline.replace('Email Outreach - ', '').replace('Method', '').trim(),
            expected: Math.round(expected),
            actual: revenue,
            efficiency: efficiency,
            count: count
          }
        })
        setPerformanceData(fallbackPerformanceData)
      }

      // Prepare attribution flow data
      const attributionFlowMetrics = Object.entries(attributionBreakdown).map(([source, count]: [string, any]) => {
        const revenue = revenueBreakdown[source] || 0
        const percentage = activeClientsCount > 0 ? (count / activeClientsCount) * 100 : 0
        return {
          source,
          clients: count,
          revenue,
          percentage,
          confidence: 0.85 // Default confidence
        }
      })
      setAttributionFlowData(attributionFlowMetrics)

      // Prepare enhanced client insights data
      if (rawReport?.attributed_clients_data) {
        const clients = rawReport.attributed_clients_data

        // Revenue distribution for client insights
        const revenueRanges = [
          { min: 0, max: 100, label: '$0-100' },
          { min: 100, max: 500, label: '$100-500' },
          { min: 500, max: 1000, label: '$500-1k' },
          { min: 1000, max: 5000, label: '$1k-5k' },
          { min: 5000, max: Infinity, label: '$5k+' }
        ]

        const revenueDistribution = revenueRanges.map(range => {
          const clientsInRange = clients.filter((client: any) => {
            const revenue = parseFloat(client.revenue) || 0
            return revenue >= range.min && revenue < range.max
          })
          
          return {
            range: range.label,
            count: clientsInRange.length,
            totalRevenue: clientsInRange.reduce((sum: number, client: any) => sum + (parseFloat(client.revenue) || 0), 0)
          }
        })

        // High Value Clients (revenue > $1000) by revenue with right holder names
        const highValueClientsList = clients
          .filter((client: any) => (parseFloat(client.revenue) || 0) > 1000)
          .map((client: any) => ({
            email: client.email,
            right_holder_name: client.right_holder_name || '',
            displayName: client.right_holder_name && client.right_holder_name.trim() !== '' 
              ? client.right_holder_name 
              : client.email, // Fallback to email if no right holder name
            revenue: parseFloat(client.revenue) || 0,
            attribution_source: client.attribution_source || 'Unattributed',
            status: client.status,
            confidence: client.attribution_confidence || 0
          }))
          .sort((a: any, b: any) => b.revenue - a.revenue)

        // Enhanced client segments
        const highValueClients = clients.filter((c: any) => (parseFloat(c.revenue) || 0) > 1000)
        const activeClients = clients.filter((c: any) => c.status === 'Active')
        const inactiveClients = clients.filter((c: any) => c.status !== 'Active')
        const highConfidenceClients = clients.filter((c: any) => (c.attribution_confidence || 0) > 0.8)
        
        // Attribution method analysis
        const attributionMethodCounts = clients.reduce((acc: any, client: any) => {
          const source = client.attribution_source || 'Unattributed'
          acc[source] = (acc[source] || 0) + 1
          return acc
        }, {})
        
        // Find best attribution method by client count
        const bestAttributionMethod = Object.entries(attributionMethodCounts)
          .sort(([,a]: any, [,b]: any) => b - a)[0]
        
        // Calculate inactive client value using attribution data and expected revenue
        const attributedInactiveClients = inactiveClients.filter((c: any) => 
          c.attribution_source && c.attribution_source !== 'Unattributed'
        )
        
        // Calculate actual revenue from inactive clients
        const inactiveActualRevenue = inactiveClients.reduce((sum: number, client: any) => 
          sum + (parseFloat(client.revenue) || 0), 0)
        
        // Calculate expected revenue for attributed inactive clients
        let inactiveTotalExpected = 0
        let inactiveTop3Expected = 0
        
        // Use pipeline breakdown data if available for more accurate expected revenue
        if (rawReport?.additional_data?.pipeline_revenue_breakdown) {
          const pipelineBreakdown = rawReport.additional_data.pipeline_revenue_breakdown
          
          attributedInactiveClients.forEach((client: any) => {
            const pipeline = client.attribution_source
            if (pipelineBreakdown[pipeline]) {
              // Estimate expected revenue based on pipeline averages
              const pipelineData = pipelineBreakdown[pipeline]
              if (pipelineData.count > 0) {
                const avgTotalExpected = pipelineData.total_expected / pipelineData.count
                const avgTop3Expected = pipelineData.top3_expected / pipelineData.count
                
                inactiveTotalExpected += avgTotalExpected
                inactiveTop3Expected += avgTop3Expected
              }
            }
          })
        } else {
          // Fallback: use standard client value estimates
          const standardClientValue = 850 // Average client value
          inactiveTotalExpected = attributedInactiveClients.length * standardClientValue * 1.2 // 20% potential uplift
          inactiveTop3Expected = attributedInactiveClients.length * standardClientValue * 0.8 // Conservative estimate
        }
        
        // Attribution method performance analysis
        const attributionMethodAnalysis = Object.entries(attributionMethodCounts).map(([method, count]: [string, any]) => {
          const methodClients = clients.filter((c: any) => (c.attribution_source || 'Unattributed') === method)
          const methodRevenue = methodClients.reduce((sum: number, client: any) => sum + (parseFloat(client.revenue) || 0), 0)
          const avgRevenue = count > 0 ? methodRevenue / count : 0
          
          return {
            method,
            clients: count,
            revenue: methodRevenue,
            avgRevenue,
            percentage: (count / clients.length) * 100
          }
        }).sort((a, b) => b.clients - a.clients)

        setClientInsightsData({
          revenueDistribution,
          highValueClients: highValueClientsList,
          segments: {
            highValue: highValueClients.length,
            active: activeClients.length,
            inactive: inactiveClients.length,
            highConfidence: highConfidenceClients.length,
            totalClients: clients.length
          },
          inactiveAnalysis: {
            count: inactiveClients.length,
            attributedCount: attributedInactiveClients.length,
            actualRevenue: inactiveActualRevenue,
            totalExpectedRevenue: inactiveTotalExpected,
            top3ExpectedRevenue: inactiveTop3Expected,
            avgActualRevenue: inactiveClients.length > 0 ? inactiveActualRevenue / inactiveClients.length : 0,
            avgTotalExpected: attributedInactiveClients.length > 0 ? inactiveTotalExpected / attributedInactiveClients.length : 0,
            avgTop3Expected: attributedInactiveClients.length > 0 ? inactiveTop3Expected / attributedInactiveClients.length : 0,
            percentage: (inactiveClients.length / clients.length) * 100,
            attributionRate: inactiveClients.length > 0 ? (attributedInactiveClients.length / inactiveClients.length) * 100 : 0
          },
          bestAttributionMethod: {
            method: bestAttributionMethod ? bestAttributionMethod[0] : 'Unknown',
            clients: bestAttributionMethod ? bestAttributionMethod[1] : 0,
            percentage: bestAttributionMethod ? (bestAttributionMethod[1] as number / clients.length) * 100 : 0
          },
          attributionMethodAnalysis
        })
      }

      // Load time series signup data
      try {
        const timeSeriesAnalysis = workerDataService.getTimeSeriesSignupData(timeSeriesGranularity)
        setTimeSeriesData(timeSeriesAnalysis)
      } catch (error) {
        console.warn('⚠️ Could not load time series data:', error)
        setTimeSeriesData(null)
      }
      
    } catch (error) {
      console.error('Error fetching general KPIs:', error)
      setError(error instanceof Error ? error.message : 'Failed to load KPIs')
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
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-black">Business Intelligence Dashboard</h2>
            <p className="mt-1 text-sm text-black">
              Cross-pipeline performance, revenue analytics, and client insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <DownloadReportButton />
          </div>
        </div>
        <DataTimestamp className="mt-2" />
      </div>

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        <KPICard
          title="Total Revenue"
          value={`$${kpis.totalRevenue.toLocaleString()}`}
          description="All-time revenue across pipelines"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Active Clients"
          value={kpis.activeClients.toLocaleString()}
          description={`From ${kpis.totalContacts.toLocaleString()} contacts`}
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Attributed Clients"
          value={kpis.attributedClients.toLocaleString()}
          description="Clients with known pipeline"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Total Clients"
          value={kpis.totalClients.toLocaleString()}
          description="Including inactive clients"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Pipeline Attribution"
          value={`${kpis.attributionCoverage.toFixed(1)}%`}
          description="Overall attribution rate"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Contact Attribution"
          value={`${kpis.contactAttributionCoverage.toFixed(1)}%`}
          description="Clients linked to contacts"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Average Deal"
          value={`$${kpis.avgDealAmount.toFixed(0)}`}
          description="Revenue per client"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Total Conversion Rate"
          value={`${kpis.totalConversionRate.toFixed(2)}%`}
          description="All clients from contacts"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Attributed Conversion Rate"
          value={`${kpis.attributedConversionRate.toFixed(2)}%`}
          description="Attributed clients from contacts"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Active Conversion Rate"
          value={`${kpis.activeConversionRate.toFixed(2)}%`}
          description="Active clients from contacts"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Total Contacts"
          value={kpis.totalContacts.toLocaleString()}
          description="All outreach attempts"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueAnalytics data={revenueData} pipelineData={pipelineData} expectedRevenueData={expectedRevenueData} />
        <PipelineDistribution data={pipelineData} />
      </div>

      {/* Time Series Signup Analysis */}
      {timeSeriesData && timeSeriesData.chartData && timeSeriesData.chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-black">Pipeline Signup Trends</h3>
                <p className="text-sm text-black mt-1">
                  Client acquisition trends across all pipelines over time
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-black">Granularity:</label>
                <select
                  value={timeSeriesGranularity}
                  onChange={(e) => setTimeSeriesGranularity(e.target.value as 'week' | 'month' | 'quarter')}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="quarter">Quarterly</option>
                </select>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-black">{timeSeriesData.summary.totalSignups}</div>
                <div className="text-sm text-gray-600">Total Signups</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-black">{timeSeriesData.summary.periodsAnalyzed}</div>
                <div className="text-sm text-gray-600">Periods Analyzed</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-black">
                  {timeSeriesData.summary.peakPeriod?.period || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Peak Period</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-black">
                  {timeSeriesData.summary.peakPeriod?.signups || 0}
                </div>
                <div className="text-sm text-gray-600">Peak Signups</div>
              </div>
            </div>

            {/* Stacked Area Chart */}
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={timeSeriesData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12, fill: "#000000" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12, fill: "#000000" }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff", 
                    border: "1px solid #d1d5db", 
                    borderRadius: "8px", 
                    color: "#000000" 
                  }} 
                  labelStyle={{ color: "#000000" }} 
                  itemStyle={{ color: "#000000" }}
                />
                
                {/* Area for each pipeline */}
                {timeSeriesData.pipelineNames.map((pipeline: string, index: number) => {
                  const colors = [
                    '#3B82F6', // Email Old Method - Blue
                    '#10B981', // Email New Method - Green  
                    '#F59E0B', // Instagram - Orange
                    '#EF4444', // Royalty Audit - Red
                    '#8B5CF6', // Unattributed - Purple
                  ];
                  return (
                    <Area
                      key={pipeline}
                      type="monotone"
                      dataKey={pipeline}
                      stackId="1"
                      stroke={colors[index % colors.length]}
                      fill={colors[index % colors.length]}
                      fillOpacity={0.6}
                      name={pipeline}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>

            {/* Pipeline Totals Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-black mb-3">Pipeline Totals</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {timeSeriesData.pipelineNames.map((pipeline: string, index: number) => {
                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                  const total = timeSeriesData.summary.pipelineTotals[pipeline] || 0;
                  const percentage = timeSeriesData.summary.totalSignups > 0 
                    ? ((total / timeSeriesData.summary.totalSignups) * 100).toFixed(1)
                    : '0.0';
                  
                  return (
                    <div key={pipeline} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-black truncate">{pipeline}</div>
                        <div className="text-xs text-gray-600">{total} ({percentage}%)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Analytics - Note: Expected vs Actual analysis now integrated into RevenueAnalytics above */}

      {/* Attribution Flow Analysis */}
      {attributionFlowData && attributionFlowData.length > 0 && (
        <AttributionFlowChart 
          data={attributionFlowData}
          title="Revenue Attribution Flow Analysis"
          height={400}
          showRevenue={false}
        />
      )}

      {/* Client Insights */}
      {clientInsightsData && (
        <div className="space-y-6">
          {/* Client Insights Header */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-medium text-black mb-4">Client Insights Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-1">High Value Clients</h4>
                  <p className="text-2xl font-bold text-green-700">{clientInsightsData.segments.highValue}</p>
                  <p className="text-sm text-green-600">Revenue &gt; $1,000</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-1">Active Clients</h4>
                  <p className="text-2xl font-bold text-blue-700">{clientInsightsData.segments.active}</p>
                  <p className="text-sm text-blue-600">Currently active status</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-1">Inactive Clients</h4>
                  <p className="text-2xl font-bold text-orange-700">{clientInsightsData.segments.inactive}</p>
                  <p className="text-sm text-orange-600">{clientInsightsData.inactiveAnalysis?.percentage.toFixed(1)}% of portfolio</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-1">High Confidence</h4>
                  <p className="text-2xl font-bold text-purple-700">{clientInsightsData.segments.highConfidence}</p>
                  <p className="text-sm text-purple-600">Attribution &gt; 80%</p>
                </div>
              </div>
              
              {/* Best Attribution Method & Inactive Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Best Attribution Method</h4>
                  <p className="text-xl font-bold text-indigo-700 mb-1">{clientInsightsData.bestAttributionMethod?.method}</p>
                  <p className="text-sm text-indigo-600 mb-1">
                    {clientInsightsData.bestAttributionMethod?.clients} clients ({clientInsightsData.bestAttributionMethod?.percentage.toFixed(1)}%)
                  </p>
                  <p className="text-xs text-indigo-500">Highest client acquisition method</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-3">Inactive Client Value</h4>
                  
                  {/* Dual Perspective View */}
                  <div className="space-y-3">
                    {/* Current Actual Revenue */}
                    <div>
                      <p className="text-lg font-bold text-red-700">${clientInsightsData.inactiveAnalysis?.actualRevenue.toLocaleString()}</p>
                      <p className="text-xs text-red-600">Current actual revenue</p>
                    </div>
                    
                    {/* Expected Revenue Potential */}
                    <div className="pt-2 border-t border-red-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <p className="font-semibold text-red-800">${clientInsightsData.inactiveAnalysis?.totalExpectedRevenue.toLocaleString()}</p>
                          <p className="text-red-600">Total Expected</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-red-800">${clientInsightsData.inactiveAnalysis?.top3ExpectedRevenue.toLocaleString()}</p>
                          <p className="text-red-600">Top3 Expected</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="pt-2 border-t border-red-200">
                      <p className="text-xs text-red-600">
                        <span className="font-medium text-black">{clientInsightsData.inactiveAnalysis?.count}</span> inactive clients • 
                        <span className="font-medium text-black"> {clientInsightsData.inactiveAnalysis?.attributedCount}</span> attributed 
                        ({clientInsightsData.inactiveAnalysis?.attributionRate.toFixed(1)}%)
                      </p>
                      <p className="text-xs text-red-500 mt-1">Reactivation opportunity potential</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Distribution & High Value Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Revenue Distribution */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-medium text-black mb-4">Client Revenue Distribution</h3>
                <div className="space-y-3">
                  {clientInsightsData.revenueDistribution.map((range: any, index: number) => (
                    <div key={range.range} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full`} style={{ 
                          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index] 
                        }}></div>
                        <span className="text-sm font-medium text-black">{range.range}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-black">{range.count} clients</p>
                        <p className="text-xs text-black">${range.totalRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* High Value Clients with Pagination */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-black">High Value Clients</h3>
                  <span className="text-sm text-gray-600">
                    {clientInsightsData.highValueClients.length} clients (Revenue &gt; $1,000)
                  </span>
                </div>
                
                {(() => {
                  const itemsPerPage = 7;
                  const totalPages = Math.ceil(clientInsightsData.highValueClients.length / itemsPerPage);
                  const currentPageData = clientInsightsData.highValueClients.slice(
                    currentHighValuePage * itemsPerPage,
                    (currentHighValuePage + 1) * itemsPerPage
                  );
                  
                  return (
                    <>
                      <div className="space-y-3 min-h-[280px]">
                        {currentPageData.map((client: any, index: number) => (
                          <div key={client.email} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-black truncate" title={client.displayName}>
                                {client.displayName}
                              </p>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-black">{client.attribution_source}</p>
                                {client.right_holder_name && client.right_holder_name !== client.email && (
                                  <p className="text-xs text-black opacity-75" title={client.email}>
                                    • {client.email.length > 20 ? client.email.substring(0, 20) + '...' : client.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm font-semibold text-black">${client.revenue.toLocaleString()}</p>
                              <p className="text-xs text-black">{(client.confidence * 100).toFixed(0)}% conf.</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600">
                            Page {currentHighValuePage + 1} of {totalPages}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setCurrentHighValuePage(Math.max(0, currentHighValuePage - 1))}
                              disabled={currentHighValuePage === 0}
                              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setCurrentHighValuePage(Math.min(totalPages - 1, currentHighValuePage + 1))}
                              disabled={currentHighValuePage >= totalPages - 1}
                              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Update Notification */}
      <DataUpdateNotification onRefresh={handleDataRefresh} />
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { workerDataService, InstagramOutreachKPIs } from '@/services/workerDataService'
import { ensureWorkerDataLoaded } from '@/utils/loadWorkerData'
import { KPICard } from '@/components/ui/KPICard'
import { DataUpdateNotification } from '@/components/ui/DataUpdateNotification'
import { DataTimestamp } from '@/components/ui/DataTimestamp'
import { PipelineTimeSeriesChart } from '@/components/charts/PipelineTimeSeriesChart'
import { EnhancedPipelineTimeSeriesChart } from '@/components/charts/EnhancedPipelineTimeSeriesChart'
import { MultiSeriesTimeSeriesChart } from '@/components/charts/MultiSeriesTimeSeriesChart'
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
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from 'recharts'

export function InstagramOutreachTab() {
  const [kpis, setKpis] = useState<InstagramOutreachKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversionFunnelData, setConversionFunnelData] = useState<any>(null)
  const [linkTypeComparisonData, setLinkTypeComparisonData] = useState<any>(null)
  const [revenueDistributionData, setRevenueDistributionData] = useState<any>(null)
  const [performanceAnalysisData, setPerformanceAnalysisData] = useState<any>(null)

  useEffect(() => {
    fetchInstagramOutreachKPIs()
  }, [])

  const handleDataRefresh = async () => {
    console.log('🔄 Instagram outreach tab refreshing data...')
    await fetchInstagramOutreachKPIs()
  }

  const fetchInstagramOutreachKPIs = async () => {
    try {
      setLoading(true)
      
      // Ensure worker data is loaded
      await ensureWorkerDataLoaded()

      // Get Instagram Outreach KPIs from worker data service
      const workerKPIs = workerDataService.getInstagramOutreachKPIs()
      setKpis(workerKPIs)

      // Get data sources summary for conversion funnel
      const rawReport = workerDataService.getRawReport()
      const dataSummary = rawReport?.data_sources_summary
      
      if (dataSummary && workerKPIs) {
        // Prepare conversion funnel data with robust fallbacks
        const convrtLeads = dataSummary.convrt_leads || 0
        const totalClients = workerKPIs.totalInstagramClients
        const activeClientsEstimate = Math.round(totalClients * 0.9) // Assume 90% active
        const totalRevenue = workerKPIs.totalInstagramRevenue
        
        // Use actual Convrt leads if available, otherwise estimate based on conversion rate
        const estimatedLeads = convrtLeads > 0 
          ? convrtLeads 
          : Math.max(totalClients * 15, totalClients + 100) // Estimate 6.7% conversion rate or minimum buffer
        
        // Create dual-track funnel: Count track + Revenue track
        const funnelData = [
          // Count Track
          { 
            name: 'Convrt Leads (Count)', 
            value: estimatedLeads, 
            color: '#E91E63',
            track: 'count',
            description: convrtLeads > 0 ? 'Actual Convrt campaign leads' : 'Estimated campaign leads (6.7% conversion assumption)'
          },
          { 
            name: 'Instagram Clients (Count)', 
            value: totalClients, 
            color: '#9C27B0',
            track: 'count',
            description: `${workerKPIs.reportLinkClients} report link + ${workerKPIs.auditLinkClients} audit link clients`
          },
          { 
            name: 'Active Clients (Count)', 
            value: activeClientsEstimate, 
            color: '#673AB7',
            track: 'count',
            description: 'Currently active clients generating revenue (estimated 90%)'
          },
          // Revenue Track
          { 
            name: 'Lead Revenue Potential', 
            value: Math.round(totalRevenue * 1.5), // Estimate total potential from all leads
            color: '#7C3AED',
            track: 'revenue',
            description: 'Estimated revenue potential from all Convrt leads'
          },
          { 
            name: 'Instagram Revenue', 
            value: totalRevenue, 
            color: '#3F51B5',
            track: 'revenue',
            description: `$${totalRevenue.toLocaleString()} total revenue from Instagram outreach`
          },
          { 
            name: 'Active Revenue', 
            value: Math.round(totalRevenue * 0.9), // 90% of revenue is from active clients
            color: '#1E40AF',
            track: 'revenue',
            description: 'Revenue from currently active clients (estimated 90%)'
          }
        ]
        
        console.log('🔍 Instagram Funnel Data:', funnelData);
        setConversionFunnelData(funnelData)

        // Prepare link type comparison data
        const linkComparison = [
          {
            linkType: 'Report Link',
            clients: workerKPIs.reportLinkClients,
            revenue: workerKPIs.reportLinkRevenue,
            avgRevenue: workerKPIs.avgRevenuePerReportLink,
            conversionRate: ((workerKPIs.reportLinkClients / (convrtLeads * 0.7)) * 100) || 0, // Assume 70% of leads are report links
            efficiency: workerKPIs.avgRevenuePerReportLink > workerKPIs.avgRevenuePerAuditLink ? 100 : (workerKPIs.avgRevenuePerReportLink / workerKPIs.avgRevenuePerAuditLink) * 100
          },
          {
            linkType: 'Audit Link',
            clients: workerKPIs.auditLinkClients,
            revenue: workerKPIs.auditLinkRevenue,
            avgRevenue: workerKPIs.avgRevenuePerAuditLink,
            conversionRate: ((workerKPIs.auditLinkClients / (convrtLeads * 0.3)) * 100) || 0, // Assume 30% of leads are audit links
            efficiency: workerKPIs.avgRevenuePerAuditLink > workerKPIs.avgRevenuePerReportLink ? 100 : (workerKPIs.avgRevenuePerAuditLink / workerKPIs.avgRevenuePerReportLink) * 100
          }
        ]
        setLinkTypeComparisonData(linkComparison)

        // Prepare revenue distribution data
        const revenueDistribution = [
          { 
            name: 'Report Link', 
            value: workerKPIs.reportLinkRevenue, 
            percentage: (workerKPIs.reportLinkRevenue / workerKPIs.totalInstagramRevenue) * 100,
            clients: workerKPIs.reportLinkClients
          },
          { 
            name: 'Audit Link', 
            value: workerKPIs.auditLinkRevenue, 
            percentage: (workerKPIs.auditLinkRevenue / workerKPIs.totalInstagramRevenue) * 100,
            clients: workerKPIs.auditLinkClients
          }
        ]
        setRevenueDistributionData(revenueDistribution)

        // Prepare performance analysis data for 2025 quarters only
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1 // 1-12
        const currentQuarter = Math.ceil(currentMonth / 3)
        
        const performanceData = []
        
        // Check if we have actual timing data from the worker
        const instagramTimingData = rawReport?.additional_data?.quarterly_breakdown?.instagram_outreach;
        
        if (instagramTimingData) {
          // Use actual quarterly data from worker if available
          Object.entries(instagramTimingData).forEach(([quarter, data]: [string, any]) => {
            if (quarter.includes('2025')) {
              performanceData.push({
                quarter,
                reportClients: data.report_link_clients || 0,
                auditClients: data.audit_link_clients || 0,
                reportRevenue: data.report_link_revenue || 0,
                auditRevenue: data.audit_link_revenue || 0
              });
            }
          });
        } else {
          // Fallback: Show only current quarter data to avoid hardcoded assumptions
          console.warn('⚠️ No actual quarterly data available for Instagram, showing current quarter only');
          performanceData.push({
            quarter: `Q${currentQuarter} ${currentYear}`,
            reportClients: workerKPIs.reportLinkClients,
            auditClients: workerKPIs.auditLinkClients,
            reportRevenue: workerKPIs.reportLinkRevenue,
            auditRevenue: workerKPIs.auditLinkRevenue
          });
        }
        
        setPerformanceAnalysisData(performanceData)
      }
    } catch (error) {
      console.error('Error fetching Instagram outreach KPIs:', error)
      setError(error instanceof Error ? error.message : 'Failed to load Instagram outreach KPIs')
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
        <h2 className="text-2xl font-bold text-black">Instagram Outreach Performance & Analytics</h2>
        <p className="mt-1 text-sm text-black">
          Convrt campaign performance, link type analysis, and social media conversion insights (Active clients only)
        </p>
        <DataTimestamp className="mt-2" />
      </div>

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KPICard
          title="Total Instagram Clients"
          value={kpis.totalInstagramClients.toLocaleString()}
          description="All Instagram-sourced clients"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Report Link Clients"
          value={kpis.reportLinkClients.toLocaleString()}
          description="Clients via report links"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Audit Link Clients"
          value={kpis.auditLinkClients.toLocaleString()}
          description="Clients via audit links"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Total Instagram Revenue"
          value={`$${kpis.totalInstagramRevenue.toLocaleString()}`}
          description="All Instagram-sourced revenue"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Avg Revenue per Client"
          value={`$${kpis.avgRevenuePerInstagram.toFixed(0)}`}
          description="Average Instagram client value"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Report Link Revenue"
          value={`$${kpis.reportLinkRevenue.toLocaleString()}`}
          description="Revenue from report links"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Audit Link Revenue"
          value={`$${kpis.auditLinkRevenue.toLocaleString()}`}
          description="Revenue from audit links"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Report Link Conversion"
          value={`${kpis.reportLinkConversionRate.toFixed(2)}%`}
          description="Report link conversion rate"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Audit Link Conversion"
          value={`${kpis.auditLinkConversionRate.toFixed(2)}%`}
          description="Audit link conversion rate"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Instagram Link Type Time Series Analysis */}
      <MultiSeriesTimeSeriesChart 
        dataMethod="instagram"
        title="Instagram Outreach Signup Trends"
        description="Client acquisition trends comparing Report Link vs Audit Link methods over time"
        seriesConfig={[
          {
            name: "Report Link",
            color: "#F59E0B"
          },
          {
            name: "Audit Link", 
            color: "#EF4444"
          }
        ]}
        showCumulative={true}
        height={400}
      />

      {/* Enhanced Method Comparison */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-black mb-6">Enhanced Method Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-pink-50 rounded-lg p-4">
              <h4 className="font-semibold text-pink-900 mb-3">Report Link Method Performance</h4>
              <p className="text-2xl font-bold text-pink-700 mb-2">{kpis.reportLinkClients}</p>
              <p className="text-sm text-pink-600 mb-3">clients converted</p>
              
              {/* Enhanced Metrics */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-pink-500">Conversion Rate:</span>
                  <span className="text-pink-700 font-medium">
                    {kpis.reportLinkConversionRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-pink-500">Revenue Share:</span>
                  <span className="text-pink-700 font-medium">
                    {((kpis.reportLinkRevenue / kpis.totalInstagramRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-pink-500">Client Share:</span>
                  <span className="text-pink-700 font-medium">
                    {((kpis.reportLinkClients / kpis.totalInstagramClients) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-pink-500 font-medium">
                  ${kpis.reportLinkRevenue.toLocaleString()} total revenue
                </p>
                <p className="text-xs text-pink-500">
                  ${kpis.avgRevenuePerReportLink.toFixed(0)} avg per client
                </p>
              </div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 mb-3">Audit Link Method Performance</h4>
              <p className="text-2xl font-bold text-indigo-700 mb-2">{kpis.auditLinkClients}</p>
              <p className="text-sm text-indigo-600 mb-3">clients converted</p>
              
              {/* Enhanced Metrics */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-indigo-500">Conversion Rate:</span>
                  <span className="text-indigo-700 font-medium">
                    {kpis.auditLinkConversionRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-indigo-500">Revenue Share:</span>
                  <span className="text-indigo-700 font-medium">
                    {((kpis.auditLinkRevenue / kpis.totalInstagramRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-indigo-500">Client Share:</span>
                  <span className="text-indigo-700 font-medium">
                    {((kpis.auditLinkClients / kpis.totalInstagramClients) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-indigo-500 font-medium">
                  ${kpis.auditLinkRevenue.toLocaleString()} total revenue
                </p>
                <p className="text-xs text-indigo-500">
                  ${kpis.avgRevenuePerAuditLink.toFixed(0)} avg per client
                </p>
              </div>
            </div>
          </div>
          
          {/* Performance Comparison Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-black mb-3">Performance Comparison Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-black">
                  {kpis.reportLinkClients > kpis.auditLinkClients ? 'Report Link' : 
                   kpis.auditLinkClients > kpis.reportLinkClients ? 'Audit Link' : 'Tied'}
                </div>
                <div className="text-sm text-black">Higher Volume Method</div>
                <div className="text-xs text-black mt-1">
                  {Math.abs(kpis.reportLinkClients - kpis.auditLinkClients)} client difference
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-black">
                  {kpis.avgRevenuePerReportLink > kpis.avgRevenuePerAuditLink ? 'Report Link' : 'Audit Link'}
                </div>
                <div className="text-sm text-black">Higher Value Method</div>
                <div className="text-xs text-black mt-1">
                  ${Math.abs(kpis.avgRevenuePerReportLink - kpis.avgRevenuePerAuditLink).toFixed(0)} avg difference
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-black">
                  {Math.max(kpis.reportLinkConversionRate, kpis.auditLinkConversionRate).toFixed(1)}%
                </div>
                <div className="text-sm text-black">Best Conversion Rate</div>
                <div className="text-xs text-black mt-1">
                  {kpis.reportLinkConversionRate > kpis.auditLinkConversionRate ? 'Report Link' : 'Audit Link'} method
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Analytics Charts */}
      <div className="space-y-6">
        {/* Conversion Funnel */}
        {conversionFunnelData && conversionFunnelData.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-medium text-black mb-4">Instagram Conversion Funnel</h3>
              <p className="text-sm text-black mb-6">
                Track the progression from Convrt leads to revenue conversion through Instagram outreach (Active clients only)
              </p>
              
              {/* Side-by-side dual-track funnel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Count Track */}
                <div>
                  <h4 className="text-sm font-medium text-black mb-3">Count Funnel</h4>
                  <div className="space-y-3">
                    {conversionFunnelData.filter(item => item.track === 'count').map((item: any, index: number, array: any[]) => {
                      const percentage = index > 0 ? ((item.value / array[0].value) * 100).toFixed(1) : '100.0';
                      const maxValue = Math.max(...array.map(x => x.value));
                      const widthPercent = (item.value / maxValue) * 100;
                      
                      return (
                        <div key={item.name} className="relative">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-black">{item.name}</span>
                            <span className="text-xs text-gray-600">{percentage}%</span>
                          </div>
                          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div 
                              className="h-full flex items-center justify-center text-white text-sm font-medium"
                              style={{ 
                                backgroundColor: item.color,
                                width: `${Math.max(widthPercent, 15)}%` // Minimum 15% for visibility
                              }}
                            >
                              {item.value.toLocaleString()}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1" title={item.description}>
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Revenue Track */}
                <div>
                  <h4 className="text-sm font-medium text-black mb-3">Revenue Funnel</h4>
                  <div className="space-y-3">
                    {conversionFunnelData.filter(item => item.track === 'revenue').map((item: any, index: number, array: any[]) => {
                      const percentage = index > 0 ? ((item.value / array[0].value) * 100).toFixed(1) : '100.0';
                      const maxValue = Math.max(...array.map(x => x.value));
                      const widthPercent = (item.value / maxValue) * 100;
                      
                      return (
                        <div key={item.name} className="relative">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-black">{item.name}</span>
                            <span className="text-xs text-gray-600">{percentage}%</span>
                          </div>
                          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div 
                              className="h-full flex items-center justify-center text-white text-sm font-medium"
                              style={{ 
                                backgroundColor: item.color,
                                width: `${Math.max(widthPercent, 15)}%` // Minimum 15% for visibility
                              }}
                            >
                              ${item.value.toLocaleString()}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1" title={item.description}>
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Combined Summary Cards */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-black mb-3">Funnel Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-black">
                      {conversionFunnelData.find(item => item.track === 'count')?.value.toLocaleString()}
                    </div>
                    <div className="text-sm text-black">Total Leads</div>
                    <div className="text-xs text-gray-600">Starting point</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-black">
                      {conversionFunnelData.find(item => item.name.includes('Instagram Clients'))?.value.toLocaleString()}
                    </div>
                    <div className="text-sm text-black">Converted Clients</div>
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const leads = conversionFunnelData.find(item => item.track === 'count')?.value || 1;
                        const clients = conversionFunnelData.find(item => item.name.includes('Instagram Clients'))?.value || 0;
                        return `${((clients / leads) * 100).toFixed(1)}% conversion`;
                      })()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-black">
                      ${conversionFunnelData.find(item => item.name.includes('Instagram Revenue'))?.value.toLocaleString()}
                    </div>
                    <div className="text-sm text-black">Total Revenue</div>
                    <div className="text-xs text-gray-600">From conversions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Type Performance & Revenue Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Link Type Performance Comparison */}
          {linkTypeComparisonData && linkTypeComparisonData.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-medium text-black mb-4">Link Type Performance Analysis</h3>
                <p className="text-sm text-black mb-6">
                  Compare report link vs audit link campaign effectiveness
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={linkTypeComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="linkType" tick={{ fontSize: 11, fill: "#000000" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#000000" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#000000" }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'clients' ? value : name === 'revenue' ? `$${value.toLocaleString()}` : 
                        name === 'avgRevenue' ? `$${value.toFixed(0)}` : `${value.toFixed(1)}%`,
                        name === 'clients' ? 'Clients' : name === 'revenue' ? 'Revenue' : 
                        name === 'avgRevenue' ? 'Avg Revenue' : 'Conversion Rate'
                      ]}
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} 
                      labelStyle={{ color: "#000000" }} 
                      itemStyle={{ color: "#000000" }}
                    />
                    <Bar yAxisId="left" dataKey="clients" fill="#E91E63" name="clients" />
                    <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#9C27B0" strokeWidth={3} name="conversionRate" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Revenue Distribution */}
          {revenueDistributionData && revenueDistributionData.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-medium text-black mb-4">Revenue Distribution by Link Type</h3>
                <p className="text-sm text-black mb-6">
                  Revenue split between report and audit link campaigns
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueDistributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage, cx, cy, midAngle, innerRadius, outerRadius }) => {
                        if (percentage < 0.05) return null; // Don't show labels for small slices
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="#000000" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central" 
                            fontSize="12" 
                            fontWeight="600"
                          >
                            {`${percentage.toFixed(1)}%`}
                          </text>
                        );
                      }}
                    >
                      {revenueDistributionData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#E91E63' : '#9C27B0'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} labelStyle={{ color: "#000000" }} itemStyle={{ color: "#000000" }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Distribution Summary */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {revenueDistributionData.map((item: any, index: number) => (
                    <div key={item.name} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-black">${item.value.toLocaleString()}</div>
                      <div className="text-sm text-black">{item.name}</div>
                      <div className="text-xs text-black">{item.clients} clients • {item.percentage.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quarterly Performance Trends */}
        {performanceAnalysisData && performanceAnalysisData.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-medium text-black mb-4">Quarterly Performance Trends</h3>
              <p className="text-sm text-black mb-6">
                {performanceAnalysisData && performanceAnalysisData.length > 1 
                  ? 'Historical performance comparison between report and audit link campaigns'
                  : 'Current quarter performance (historical data not available)'
                }
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Acquisition Trends */}
                <div>
                  <h4 className="text-sm font-medium text-black mb-3">Client Acquisition by Quarter</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={performanceAnalysisData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: "#000000" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#000000" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} labelStyle={{ color: "#000000" }} itemStyle={{ color: "#000000" }} />
                      <Area
                        type="monotone"
                        dataKey="reportClients"
                        stackId="1"
                        stroke="#E91E63"
                        fill="#E91E63"
                        fillOpacity={0.6}
                        name="Report Link Clients"
                      />
                      <Area
                        type="monotone"
                        dataKey="auditClients"
                        stackId="1"
                        stroke="#9C27B0"
                        fill="#9C27B0"
                        fillOpacity={0.6}
                        name="Audit Link Clients"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue Trends */}
                <div>
                  <h4 className="text-sm font-medium text-black mb-3">Revenue by Quarter</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceAnalysisData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: "#000000" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#000000" }} />
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} labelStyle={{ color: "#000000" }} itemStyle={{ color: "#000000" }} />
                      <Bar dataKey="reportRevenue" fill="#E91E63" name="Report Link Revenue" />
                      <Bar dataKey="auditRevenue" fill="#9C27B0" name="Audit Link Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Type Efficiency Analysis - HIDDEN */}
        {false && linkTypeComparisonData && linkTypeComparisonData.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-medium text-black mb-4">Link Type Efficiency Comparison</h3>
              <p className="text-sm text-black mb-6">
                Detailed analysis of revenue per client and conversion efficiency by link type
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Average Revenue Comparison */}
                <div>
                  <h4 className="text-sm font-medium text-black mb-3">Average Revenue per Client</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={linkTypeComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="linkType" tick={{ fontSize: 10, fill: "#000000" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#000000" }} />
                      <Tooltip formatter={(value: number) => [`$${value.toFixed(0)}`, 'Avg Revenue']} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} labelStyle={{ color: "#000000" }} itemStyle={{ color: "#000000" }} />
                      <Bar dataKey="avgRevenue" fill="#673AB7" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Conversion Rate Comparison */}
                <div>
                  <h4 className="text-sm font-medium text-black mb-3">Conversion Rates</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={linkTypeComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="linkType" tick={{ fontSize: 10, fill: "#000000" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#000000" }} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Conversion Rate']} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} labelStyle={{ color: "#000000" }} itemStyle={{ color: "#000000" }} />
                      <Bar dataKey="conversionRate" fill="#3F51B5" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Performance Summary Cards */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {linkTypeComparisonData.map((linkType: any, index: number) => (
                  <div key={linkType.linkType} className={`p-4 rounded-lg ${index === 0 ? 'bg-pink-50' : 'bg-purple-50'}`}>
                    <h5 className={`font-semibold mb-2 ${index === 0 ? 'text-pink-900' : 'text-purple-900'}`}>
                      {linkType.linkType} Performance
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-black">Clients:</span>
                        <span className="font-medium">{linkType.clients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Revenue:</span>
                        <span className="font-medium">${linkType.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Avg per Client:</span>
                        <span className="font-medium">${linkType.avgRevenue.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Conversion Rate:</span>
                        <span className="font-medium">{linkType.conversionRate.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Data Update Notification */}
      <DataUpdateNotification onRefresh={handleDataRefresh} />
    </div>
  )
}
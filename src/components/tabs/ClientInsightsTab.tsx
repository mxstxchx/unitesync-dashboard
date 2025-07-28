'use client'

import { useEffect, useState } from 'react'
import { workerDataService, AttributedClient } from '@/services/workerDataService'
import { ensureWorkerDataLoaded } from '@/utils/loadWorkerData'
import { KPICard } from '@/components/ui/KPICard'
import { DataUpdateNotification } from '@/components/ui/DataUpdateNotification'
import { DataTimestamp } from '@/components/ui/DataTimestamp'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface ClientInsightsMetrics {
  totalClients: number
  revenueDistribution: Array<{
    range: string
    count: number
    totalRevenue: number
  }>
  statusBreakdown: Array<{
    status: string
    count: number
    percentage: number
  }>
  topClients: Array<{
    email: string
    revenue: number
    attribution_source: string
    status: string
    confidence: number
  }>
  revenueByAttribution: Array<{
    source: string
    avgRevenue: number
    count: number
    totalRevenue: number
  }>
  clientSegments: Array<{
    segment: string
    count: number
    avgRevenue: number
    totalRevenue: number
  }>
}

interface FilterState {
  status: string
  attributionSource: string
  revenueMin: number
  revenueMax: number
  searchTerm: string
}

export function ClientInsightsTab() {
  const [metrics, setMetrics] = useState<ClientInsightsMetrics | null>(null)
  const [filteredClients, setFilteredClients] = useState<AttributedClient[]>([])
  const [allClients, setAllClients] = useState<AttributedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    attributionSource: 'all',
    revenueMin: 0,
    revenueMax: 10000,
    searchTerm: ''
  })

  useEffect(() => {
    fetchClientInsights()
  }, [])

  useEffect(() => {
    if (allClients.length > 0) {
      applyFilters()
    }
  }, [filters, allClients])

  const handleDataRefresh = async () => {
    console.log('🔄 Client Insights tab refreshing data...')
    await fetchClientInsights()
  }

  const fetchClientInsights = async () => {
    try {
      setLoading(true)
      
      // Ensure worker data is loaded
      await ensureWorkerDataLoaded()

      // Get raw report data
      const rawReport = workerDataService.getRawReport()
      if (!rawReport || !rawReport.attributed_clients_data) {
        throw new Error('No client data available')
      }

      const clients = rawReport.attributed_clients_data
      setAllClients(clients)

      // Process client insights
      const clientMetrics = processClientInsights(clients)
      setMetrics(clientMetrics)
      
    } catch (error) {
      console.error('Error fetching client insights:', error)
      setError(error instanceof Error ? error.message : 'Failed to load client insights')
    } finally {
      setLoading(false)
    }
  }

  const processClientInsights = (clients: AttributedClient[]): ClientInsightsMetrics => {
    // Revenue distribution
    const revenueRanges = [
      { min: 0, max: 100, label: '$0-100' },
      { min: 100, max: 500, label: '$100-500' },
      { min: 500, max: 1000, label: '$500-1k' },
      { min: 1000, max: 5000, label: '$1k-5k' },
      { min: 5000, max: Infinity, label: '$5k+' }
    ]

    const revenueDistribution = revenueRanges.map(range => {
      const clientsInRange = clients.filter(client => {
        const revenue = parseFloat(client.revenue) || 0
        return revenue >= range.min && revenue < range.max
      })
      
      return {
        range: range.label,
        count: clientsInRange.length,
        totalRevenue: clientsInRange.reduce((sum, client) => sum + (parseFloat(client.revenue) || 0), 0)
      }
    })

    // Status breakdown
    const statusCounts = clients.reduce((acc, client) => {
      acc[client.status] = (acc[client.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / clients.length) * 100
    }))

    // Top clients by revenue
    const topClients = clients
      .map(client => ({
        email: client.email,
        revenue: parseFloat(client.revenue) || 0,
        attribution_source: client.attribution_source || 'Unattributed',
        status: client.status,
        confidence: client.attribution_confidence || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)

    // Revenue by attribution source
    const attributionGroups = clients.reduce((acc, client) => {
      const source = client.attribution_source || 'Unattributed'
      if (!acc[source]) {
        acc[source] = { clients: [], totalRevenue: 0 }
      }
      acc[source].clients.push(client)
      acc[source].totalRevenue += parseFloat(client.revenue) || 0
      return acc
    }, {} as Record<string, { clients: AttributedClient[], totalRevenue: number }>)

    const revenueByAttribution = Object.entries(attributionGroups).map(([source, data]) => ({
      source,
      count: data.clients.length,
      totalRevenue: data.totalRevenue,
      avgRevenue: data.totalRevenue / data.clients.length
    }))

    // Client segments (simplified segmentation)
    const segments = [
      { name: 'High Value', filter: (c: AttributedClient) => (parseFloat(c.revenue) || 0) > 1000 },
      { name: 'Medium Value', filter: (c: AttributedClient) => {
        const rev = parseFloat(c.revenue) || 0
        return rev >= 250 && rev <= 1000
      }},
      { name: 'Low Value', filter: (c: AttributedClient) => (parseFloat(c.revenue) || 0) < 250 },
      { name: 'Active Status', filter: (c: AttributedClient) => c.status === 'Active' },
      { name: 'High Confidence', filter: (c: AttributedClient) => (c.attribution_confidence || 0) > 0.8 }
    ]

    const clientSegments = segments.map(segment => {
      const segmentClients = clients.filter(segment.filter)
      const totalRevenue = segmentClients.reduce((sum, client) => sum + (parseFloat(client.revenue) || 0), 0)
      
      return {
        segment: segment.name,
        count: segmentClients.length,
        totalRevenue,
        avgRevenue: segmentClients.length > 0 ? totalRevenue / segmentClients.length : 0
      }
    })

    return {
      totalClients: clients.length,
      revenueDistribution,
      statusBreakdown,
      topClients,
      revenueByAttribution,
      clientSegments
    }
  }

  const applyFilters = () => {
    let filtered = [...allClients]

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(client => client.status === filters.status)
    }

    // Attribution source filter
    if (filters.attributionSource !== 'all') {
      filtered = filtered.filter(client => 
        (client.attribution_source || 'Unattributed') === filters.attributionSource
      )
    }

    // Revenue range filter
    filtered = filtered.filter(client => {
      const revenue = parseFloat(client.revenue) || 0
      return revenue >= filters.revenueMin && revenue <= filters.revenueMax
    })

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(client =>
        client.email.toLowerCase().includes(searchLower) ||
        (client.spotify_id && client.spotify_id.toLowerCase().includes(searchLower)) ||
        (client.attribution_source && client.attribution_source.toLowerCase().includes(searchLower))
      )
    }

    setFilteredClients(filtered)
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

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
        <h2 className="text-2xl font-bold text-black">Client Insights</h2>
        <p className="mt-1 text-sm text-black">
          Detailed client analysis with interactive filtering and segmentation
        </p>
        <DataTimestamp className="mt-2" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Clients"
          value={metrics.totalClients.toLocaleString()}
          description="All clients in dataset"
          trend={{ value: 0, isPositive: true }}
        />
        <KPICard
          title="Active Clients"
          value={metrics.statusBreakdown.find(s => s.status === 'Active')?.count.toLocaleString() || '0'}
          description="Currently active clients"
          trend={{ value: 5.2, isPositive: true }}
        />
        <KPICard
          title="Avg Client Value"
          value={formatCurrency(
            metrics.revenueByAttribution.reduce((sum, item) => sum + item.totalRevenue, 0) / metrics.totalClients
          )}
          description="Average revenue per client"
          trend={{ value: 8.1, isPositive: true }}
        />
        <KPICard
          title="High Value Clients"
          value={metrics.clientSegments.find(s => s.segment === 'High Value')?.count.toLocaleString() || '0'}
          description="Clients with $1k+ revenue"
          trend={{ value: 12.3, isPositive: true }}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Client Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-1">Attribution Source</label>
            <select
              value={filters.attributionSource}
              onChange={(e) => setFilters(prev => ({ ...prev, attributionSource: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              {metrics.revenueByAttribution.map(item => (
                <option key={item.source} value={item.source}>{item.source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Min Revenue</label>
            <input
              type="number"
              value={filters.revenueMin}
              onChange={(e) => setFilters(prev => ({ ...prev, revenueMin: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Max Revenue</label>
            <input
              type="number"
              value={filters.revenueMax}
              onChange={(e) => setFilters(prev => ({ ...prev, revenueMax: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Search</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email, Spotify ID..."
            />
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-black">
            Showing {filteredClients.length} of {metrics.totalClients} clients
          </span>
          <button
            onClick={() => setFilters({
              status: 'all',
              attributionSource: 'all',
              revenueMin: 0,
              revenueMax: 10000,
              searchTerm: ''
            })}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Distribution */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.revenueDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#000000" }} />
              <YAxis tick={{ fontSize: 12, fill: "#000000" }} />
              <Tooltip formatter={(value: number) => [value, 'Clients']} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} labelStyle={{ color: "#000000" }} itemStyle={{ color: "#000000" }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Client Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.statusBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
              >
                {metrics.statusBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} labelStyle={{ color: "#000000" }} itemStyle={{ color: "#000000" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Client Data Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Client Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-black">Email</th>
                <th className="text-center py-3 px-4 font-medium text-black">Revenue</th>
                <th className="text-center py-3 px-4 font-medium text-black">Status</th>
                <th className="text-center py-3 px-4 font-medium text-black">Attribution</th>
                <th className="text-center py-3 px-4 font-medium text-black">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.slice(0, 20).map((client, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-black">{client.email}</td>
                  <td className="text-center py-3 px-4 text-black">
                    {formatCurrency(parseFloat(client.revenue) || 0)}
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-black'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 text-black text-xs">
                    {client.attribution_source || 'Unattributed'}
                  </td>
                  <td className="text-center py-3 px-4 text-black">
                    {client.attribution_confidence ? `${(client.attribution_confidence * 100).toFixed(0)}%` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredClients.length > 20 && (
            <div className="mt-4 text-center text-sm text-black">
              Showing first 20 of {filteredClients.length} results
            </div>
          )}
        </div>
      </div>

      {/* Data Update Notification */}
      <DataUpdateNotification onRefresh={handleDataRefresh} />
    </div>
  )
}
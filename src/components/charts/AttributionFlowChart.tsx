'use client'

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

interface AttributionFlowData {
  source: string
  clients: number
  revenue: number
  percentage: number
  confidence?: number
}

interface AttributionFlowChartProps {
  data: AttributionFlowData[]
  title?: string
  height?: number
  showRevenue?: boolean
}

const COLORS = {
  'Email Outreach - Old Method': '#3B82F6',
  'Email Outreach - New Method': '#1D4ED8', 
  'Instagram Outreach': '#F59E0B',
  'Royalty Audit': '#10B981',
  'Unattributed': '#EF4444'
}

export function AttributionFlowChart({ 
  data, 
  title = "Attribution Source Distribution",
  height = 400,
  showRevenue = false 
}: AttributionFlowChartProps) {
  
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  const pieData = data.map(item => ({
    name: item.source,
    value: showRevenue ? item.revenue : item.clients,
    clients: item.clients,
    revenue: item.revenue,
    percentage: item.percentage,
    confidence: item.confidence
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-black mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-black">Clients:</span> {data.clients} ({data.percentage.toFixed(1)}%)
            </p>
            <p className="text-sm">
              <span className="text-black">Revenue:</span> {formatCurrency(data.revenue)}
            </p>
            {data.confidence && (
              <p className="text-sm">
                <span className="text-black">Avg Confidence:</span> {(data.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">{title}</h3>
        <p className="text-sm text-black mt-1">
          Distribution of clients and revenue across attribution sources
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-medium text-black mb-3">
            {showRevenue ? 'Revenue Distribution' : 'Client Distribution'}
          </h4>
          <ResponsiveContainer width="100%" height={height * 0.8}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div>
          <h4 className="text-sm font-medium text-black mb-3">Revenue per Client</h4>
          <ResponsiveContainer width="100%" height={height * 0.8}>
            <BarChart
              data={data.map(item => ({
                ...item,
                revenuePerClient: item.clients > 0 ? item.revenue / item.clients : 0
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="source" 
                tick={{ fontSize: 10, fill: "#000000" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: "#000000" }}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Avg Revenue/Client']}
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} 
                labelStyle={{ color: "#000000" }} 
                itemStyle={{ color: "#000000" }}
              />
              <Bar
                dataKey="revenuePerClient"
                fill="#6366F1"
                radius={[2, 2, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`bar-cell-${index}`} 
                    fill={COLORS[entry.source as keyof typeof COLORS] || '#6366F1'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attribution Summary Table */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-black mb-3">Attribution Summary</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-black">Source</th>
                <th className="text-right py-2 px-3 font-medium text-black">Clients</th>
                <th className="text-right py-2 px-3 font-medium text-black">Revenue</th>
                <th className="text-right py-2 px-3 font-medium text-black">Avg/Client</th>
                <th className="text-right py-2 px-3 font-medium text-black">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 px-3">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: COLORS[item.source as keyof typeof COLORS] || '#8884d8' }}
                      />
                      <span className="text-black">{item.source}</span>
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 text-black">{item.clients}</td>
                  <td className="text-right py-2 px-3 text-black">{formatCurrency(item.revenue)}</td>
                  <td className="text-right py-2 px-3 text-black">
                    {item.clients > 0 ? formatCurrency(item.revenue / item.clients) : '$0'}
                  </td>
                  <td className="text-right py-2 px-3 text-black">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
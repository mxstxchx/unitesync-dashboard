'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'

interface SequenceVariantData {
  variant: string
  count: number
  conversionRate: number
  replyRate: number
  positiveRate: number
  avgRevenue: number
  clients: string[]
}

interface PerformanceHeatmapChartProps {
  data: SequenceVariantData[]
  title?: string
  height?: number
}

export function PerformanceHeatmapChart({ 
  data, 
  title = "Sequence Variant Performance Analysis",
  height = 500 
}: PerformanceHeatmapChartProps) {
  
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return '$0'
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return '0.0%'
    return `${value.toFixed(1)}%`
  }

  // Color intensity based on performance
  const getPerformanceColor = (value: number | undefined, max: number) => {
    if (value === undefined || value === null || isNaN(value) || max === 0) return '#6B7280' // Gray
    const intensity = value / max
    if (intensity >= 0.8) return '#10B981' // Green
    if (intensity >= 0.6) return '#F59E0B' // Yellow  
    if (intensity >= 0.4) return '#EF4444' // Red
    return '#6B7280' // Gray
  }

  const maxValues = {
    count: Math.max(...data.map(d => d.count || 0)),
    conversionRate: Math.max(...data.map(d => d.conversionRate || 0)),
    replyRate: Math.max(...data.map(d => d.replyRate || 0)),
    positiveRate: Math.max(...data.map(d => d.positiveRate || 0)),
    avgRevenue: Math.max(...data.map(d => d.avgRevenue || 0))
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-black mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-black">Clients:</span> {data.count}
            </p>
            <p className="text-sm">
              <span className="text-black">Conversion Rate:</span> {formatPercent(data.conversionRate)}
            </p>
            <p className="text-sm">
              <span className="text-black">Reply Rate:</span> {formatPercent(data.replyRate)}
            </p>
            <p className="text-sm">
              <span className="text-black">Positive Rate:</span> {formatPercent(data.positiveRate)}
            </p>
            <p className="text-sm">
              <span className="text-black">Avg Revenue:</span> {formatCurrency(data.avgRevenue)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">{title}</h3>
        <p className="text-sm text-black mt-1">
          Performance metrics comparison across sequence variants
        </p>
      </div>

      {/* Performance Metrics Grid */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-black mb-3">Performance Heatmap</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-black">Variant</th>
                <th className="text-center py-3 px-4 font-medium text-black">Clients</th>
                <th className="text-center py-3 px-4 font-medium text-black">Conv. Rate</th>
                <th className="text-center py-3 px-4 font-medium text-black">Reply Rate</th>
                <th className="text-center py-3 px-4 font-medium text-black">Positive Rate</th>
                <th className="text-center py-3 px-4 font-medium text-black">Avg Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((variant, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-black">{variant.variant}</td>
                  <td className="text-center py-3 px-4">
                    <div 
                      className="inline-block px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: getPerformanceColor(variant.count, maxValues.count) }}
                    >
                      {variant.count}
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div 
                      className="inline-block px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: getPerformanceColor(variant.conversionRate, maxValues.conversionRate) }}
                    >
                      {formatPercent(variant.conversionRate)}
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div 
                      className="inline-block px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: getPerformanceColor(variant.replyRate, maxValues.replyRate) }}
                    >
                      {formatPercent(variant.replyRate)}
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div 
                      className="inline-block px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: getPerformanceColor(variant.positiveRate, maxValues.positiveRate) }}
                    >
                      {formatPercent(variant.positiveRate)}
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div 
                      className="inline-block px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: getPerformanceColor(variant.avgRevenue, maxValues.avgRevenue) }}
                    >
                      {formatCurrency(variant.avgRevenue)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rate Chart */}
        <div>
          <h4 className="text-sm font-medium text-black mb-3">Conversion Rate by Variant</h4>
          <ResponsiveContainer width="100%" height={height * 0.6}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="variant" 
                tick={{ fontSize: 11, fill: "#000000" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={formatPercent}
                tick={{ fontSize: 12, fill: "#000000" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="conversionRate" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getPerformanceColor(entry.conversionRate, maxValues.conversionRate)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Performance Chart */}
        <div>
          <h4 className="text-sm font-medium text-black mb-3">Average Revenue by Variant</h4>
          <ResponsiveContainer width="100%" height={height * 0.6}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="variant" 
                tick={{ fontSize: 11, fill: "#000000" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: "#000000" }}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Avg Revenue']}
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#000000" }} 
                labelStyle={{ color: "#000000" }} 
                itemStyle={{ color: "#000000" }}
              />
              <Bar dataKey="avgRevenue" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getPerformanceColor(entry.avgRevenue, maxValues.avgRevenue)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-black">High Performance (80%+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-black">Good Performance (60-80%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-black">Needs Improvement (40-60%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-black">Low Performance (&lt;40%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface RevenueFunnelData {
  pipeline: string
  expected: number
  actual: number
  efficiency: number
  count: number
}

interface RevenueFunnelChartProps {
  data: RevenueFunnelData[]
  title?: string
  height?: number
}

const COLORS = {
  expected: '#3B82F6', // Blue
  actual: '#10B981',   // Green
  gap: '#EF4444'       // Red
}

export function RevenueFunnelChart({ 
  data, 
  title = "Revenue Performance: Expected vs Actual",
  height = 400 
}: RevenueFunnelChartProps) {
  // Transform data for the chart
  const chartData = data.map(item => ({
    ...item,
    gap: item.expected - item.actual,
    efficiencyPercent: Math.round(item.efficiency * 100)
  }))

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  const formatTooltip = (value: number, name: string, props: any) => {
    const { payload } = props
    if (name === 'expected') {
      return [`${formatCurrency(value)}`, 'Expected Revenue']
    }
    if (name === 'actual') {
      return [`${formatCurrency(value)}`, 'Actual Revenue']
    }
    if (name === 'gap') {
      return [`${formatCurrency(value)}`, 'Revenue Gap']
    }
    return [formatCurrency(value), name]
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-black mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">Expected:</span> {formatCurrency(data.expected)}
            </p>
            <p className="text-sm">
              <span className="text-green-600">Actual:</span> {formatCurrency(data.actual)}
            </p>
            <p className="text-sm">
              <span className="text-red-600">Gap:</span> {formatCurrency(data.gap)}
            </p>
            <p className="text-sm font-medium">
              <span className="text-black">Efficiency:</span> {data.efficiencyPercent}%
            </p>
            <p className="text-sm">
              <span className="text-black">Clients:</span> {data.count}
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
          Compare expected revenue potential vs actual performance by pipeline
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="pipeline" 
            tick={{ fontSize: 12, fill: "#000000" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: "#000000" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#000000" }} />
          
          <Bar
            dataKey="expected"
            name="Expected Revenue"
            fill={COLORS.expected}
            opacity={0.8}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="actual"
            name="Actual Revenue"
            fill={COLORS.actual}
            opacity={0.9}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {chartData.map((item, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-black uppercase tracking-wide">
                {item.pipeline.split(' ')[0]}
              </div>
              <div className="text-lg font-semibold text-black">
                {item.efficiencyPercent}%
              </div>
              <div className="text-xs text-black">efficiency</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
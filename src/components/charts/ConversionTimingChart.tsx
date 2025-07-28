'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface ConversionTimingData {
  date: string
  conversions: number
  emailsSent: number
  cumulativeConversions: number
  avgDaysToConvert: number
  variant?: string
}

interface ConversionTimingChartProps {
  data: ConversionTimingData[]
  title?: string
  height?: number
  showCumulative?: boolean
}

export function ConversionTimingChart({ 
  data, 
  title = "Conversion Timing Analysis",
  height = 400,
  showCumulative = false 
}: ConversionTimingChartProps) {
  
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd')
    } catch {
      return dateStr
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-black mb-2">{formatDate(label)}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm">
                <span style={{ color: entry.color }}>
                  {entry.name}:
                </span> {entry.value}
                {entry.name.includes('Days') && ' days'}
                {entry.name.includes('Rate') && '%'}
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate conversion velocity (conversions per day)
  const dataWithVelocity = data.map((item, index) => {
    const prevItem = index > 0 ? data[index - 1] : null
    const velocity = prevItem 
      ? ((item.cumulativeConversions - prevItem.cumulativeConversions) / 1) 
      : 0
    return {
      ...item,
      velocity,
      conversionRate: item.emailsSent > 0 ? (item.conversions / item.emailsSent) * 100 : 0
    }
  })

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black">{title}</h3>
        <p className="text-sm text-black mt-1">
          Track conversion patterns and timing trends over time
        </p>
      </div>

      <div className="space-y-6">
        {/* Primary Conversion Timeline */}
        <div>
          <h4 className="text-sm font-medium text-black mb-3">
            {showCumulative ? 'Cumulative Conversions' : 'Daily Conversions'}
          </h4>
          <ResponsiveContainer width="100%" height={height * 0.7}>
            {showCumulative ? (
              <AreaChart data={dataWithVelocity} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#000000" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "#000000" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulativeConversions"
                  name="Cumulative Conversions"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <BarChart data={dataWithVelocity} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#000000" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "#000000" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="conversions"
                  name="Daily Conversions"
                  fill="#10B981"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Conversion Rate and Days to Convert */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-black mb-3">Conversion Rate Trend</h4>
            <ResponsiveContainer width="100%" height={height * 0.6}>
              <LineChart data={dataWithVelocity} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#000000" }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: "#000000" }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="conversionRate"
                  name="Conversion Rate"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-medium text-black mb-3">Average Days to Convert</h4>
            <ResponsiveContainer width="100%" height={height * 0.6}>
              <LineChart data={dataWithVelocity} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#000000" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "#000000" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="avgDaysToConvert"
                  name="Avg Days to Convert"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-black mb-3">Timing Insights</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-black">
              {data.reduce((sum, item) => sum + item.conversions, 0)}
            </div>
            <div className="text-xs text-black">Total Conversions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-black">
              {(data.reduce((sum, item) => sum + item.avgDaysToConvert, 0) / data.length).toFixed(1)}
            </div>
            <div className="text-xs text-black">Avg Days to Convert</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-black">
              {Math.max(...dataWithVelocity.map(d => d.velocity)).toFixed(0)}
            </div>
            <div className="text-xs text-black">Peak Daily Conversions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-black">
              {(dataWithVelocity.reduce((sum, item) => sum + item.conversionRate, 0) / dataWithVelocity.length).toFixed(1)}%
            </div>
            <div className="text-xs text-black">Avg Conversion Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}
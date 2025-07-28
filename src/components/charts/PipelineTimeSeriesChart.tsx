'use client'

import { useEffect, useState } from 'react'
import { workerDataService } from '@/services/workerDataService'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar
} from 'recharts'

interface PipelineTimeSeriesChartProps {
  pipeline: string
  title?: string
  color?: string
  showCumulative?: boolean
  height?: number
}

export function PipelineTimeSeriesChart({ 
  pipeline, 
  title, 
  color = '#3B82F6',
  showCumulative = false,
  height = 350
}: PipelineTimeSeriesChartProps) {
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null)
  const [granularity, setGranularity] = useState<'week' | 'month' | 'quarter'>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTimeSeriesData()
  }, [pipeline, granularity])

  const loadTimeSeriesData = async () => {
    try {
      setLoading(true)
      const data = workerDataService.getPipelineTimeSeriesData(pipeline, granularity)
      setTimeSeriesData(data)
    } catch (error) {
      console.warn(`⚠️ Could not load time series data for ${pipeline}:`, error)
      setTimeSeriesData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!timeSeriesData || timeSeriesData.chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-black mb-4">
            {title || `${pipeline} Signup Trends`}
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500">No signup data available for this pipeline</p>
          </div>
        </div>
      </div>
    )
  }

  const chartTitle = title || `${pipeline} Signup Trends`

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-black">{chartTitle}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Client acquisition trends over time
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-black">View:</label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as 'week' | 'month' | 'quarter')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-black">{timeSeriesData.summary.totalSignups}</div>
            <div className="text-sm text-gray-600">Total Signups</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-black">{timeSeriesData.summary.periodsAnalyzed}</div>
            <div className="text-sm text-gray-600">Periods</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-black">
              {timeSeriesData.summary.peakPeriod?.period || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Peak Period</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className={`text-lg font-semibold ${timeSeriesData.summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {timeSeriesData.summary.growthRate > 0 ? '+' : ''}{timeSeriesData.summary.growthRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Growth Rate</div>
          </div>
        </div>

        {/* Time Series Chart */}
        <ResponsiveContainer width="100%" height={height}>
          {showCumulative ? (
            <ComposedChart data={timeSeriesData.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12, fill: "#000000" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#000000" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#000000" }} />
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
              <Bar yAxisId="left" dataKey="signups" fill={color} name="New Signups" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#EF4444" 
                strokeWidth={2} 
                name="Cumulative Total"
                dot={{ fill: '#EF4444', r: 4 }}
              />
            </ComposedChart>
          ) : (
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
              <Area
                type="monotone"
                dataKey="signups"
                stroke={color}
                fill={color}
                fillOpacity={0.6}
                name="Signups"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>

        {/* Date Range Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Date Range: {timeSeriesData.summary.dateRange.start} to {timeSeriesData.summary.dateRange.end}
            </span>
            {timeSeriesData.summary.peakPeriod && (
              <span>
                Peak: {timeSeriesData.summary.peakPeriod.signups} signups in {timeSeriesData.summary.peakPeriod.period}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
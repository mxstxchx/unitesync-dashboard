'use client'

import { useEffect, useState } from 'react'
import { workerDataService } from '@/services/workerDataService'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line
} from 'recharts'

interface MultiSeriesTimeSeriesChartProps {
  dataMethod: 'email' | 'instagram' | 'inbound'
  title: string
  description?: string
  seriesConfig: Array<{
    name: string
    color: string
  }>
  showCumulative?: boolean
  height?: number
  className?: string
}

export function MultiSeriesTimeSeriesChart({ 
  dataMethod,
  title,
  description,
  seriesConfig,
  showCumulative = false,
  height = 400,
  className = ""
}: MultiSeriesTimeSeriesChartProps) {
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null)
  const [granularity, setGranularity] = useState<'week' | 'month' | 'quarter'>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTimeSeriesData()
  }, [dataMethod, granularity])

  const loadTimeSeriesData = async () => {
    try {
      setLoading(true)
      
      let data = null
      
      // Call the appropriate specialized method based on dataMethod
      switch (dataMethod) {
        case 'email':
          data = workerDataService.getEmailMethodTimeSeriesData(granularity)
          break
        case 'instagram':
          data = workerDataService.getInstagramLinkTimeSeriesData(granularity)
          break
        case 'inbound':
          data = workerDataService.getInboundReferralTimeSeriesData(granularity)
          break
        default:
          console.warn(`Unknown data method: ${dataMethod}`)
      }

      if (data && data.chartData) {
        // Add cumulative calculation if needed
        if (showCumulative) {
          let cumulativeTotal = 0
          data.chartData = data.chartData.map((item: any) => {
            cumulativeTotal += item.total || 0
            return {
              ...item,
              cumulative: cumulativeTotal
            }
          })
        }
        
        setTimeSeriesData(data)
      } else {
        setTimeSeriesData(null)
      }
    } catch (error) {
      console.warn(`⚠️ Could not load ${dataMethod} time series data:`, error)
      setTimeSeriesData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!timeSeriesData || timeSeriesData.chartData.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
        <div className="p-6">
          <h3 className="text-lg font-medium text-black mb-4">{title}</h3>
          <div className="text-center py-8">
            <p className="text-gray-500">No signup data available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-black">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
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
              
              {/* Stacked areas for each series */}
              {seriesConfig.map((series, index) => {
                // Use the key from the actual data (which is the full name from seriesNames)
                const dataKey = timeSeriesData.seriesNames.find((name: string) => 
                  name.toLowerCase().includes(series.name.toLowerCase()) ||
                  series.name.toLowerCase().includes(name.toLowerCase())
                ) || timeSeriesData.seriesNames[index]
                
                return dataKey ? (
                  <Area
                    key={`${index}-${dataKey}`}
                    yAxisId="left"
                    type="monotone"
                    dataKey={dataKey}
                    stackId="stack"
                    stroke={series.color}
                    fill={series.color}
                    fillOpacity={0.7}
                    name={series.name}
                    connectNulls={false}
                  />
                ) : null
              })}
              
              {/* Cumulative line */}
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#EF4444" 
                strokeWidth={2} 
                name="Cumulative Total"
                dot={{ fill: '#EF4444', r: 3 }}
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
              
              {/* Stacked areas for each series */}
              {seriesConfig.map((series, index) => {
                // Use the key from the actual data (which is the full name from seriesNames)
                const dataKey = timeSeriesData.seriesNames.find((name: string) => 
                  name.toLowerCase().includes(series.name.toLowerCase()) ||
                  series.name.toLowerCase().includes(name.toLowerCase())
                ) || timeSeriesData.seriesNames[index]
                
                return dataKey ? (
                  <Area
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
                    stackId="1"
                    stroke={series.color}
                    fill={series.color}
                    fillOpacity={0.6}
                    name={series.name}
                  />
                ) : null
              })}
            </AreaChart>
          )}
        </ResponsiveContainer>

        {/* Series Totals Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-black mb-3">Series Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seriesConfig.map((series, index) => {
              // Find the matching data key
              const dataKey = timeSeriesData.seriesNames.find((name: string) => 
                name.toLowerCase().includes(series.name.toLowerCase()) ||
                series.name.toLowerCase().includes(name.toLowerCase())
              ) || timeSeriesData.seriesNames[index]
              
              const total = timeSeriesData.summary.seriesTotals[dataKey] || 0
              const percentage = timeSeriesData.summary.totalSignups > 0 
                ? ((total / timeSeriesData.summary.totalSignups) * 100).toFixed(1)
                : '0.0'
              
              return (
                <div key={series.name} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: series.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-black truncate">{series.name}</div>
                    <div className="text-xs text-gray-600">{total} ({percentage}%)</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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
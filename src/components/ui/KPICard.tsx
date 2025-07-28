interface KPICardProps {
  title: string
  value: string
  description: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function KPICard({ title, value, description, trend }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-black">{title}</p>
          <p className="text-2xl font-semibold text-black">{value}</p>
        </div>
        {trend && (
          <div className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-black">{description}</p>
    </div>
  )
}
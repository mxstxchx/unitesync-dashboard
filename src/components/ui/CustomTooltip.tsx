interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number | string
    color: string
  }>
  label?: string
  formatter?: (value: number | string, name: string) => [string, string]
}

export function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-black">
      {label && (
        <p className="font-medium text-black mb-2">{label}</p>
      )}
      {payload.map((entry, index) => {
        const displayValue = formatter 
          ? formatter(entry.value, entry.name)[0] 
          : entry.value
        const displayName = formatter 
          ? formatter(entry.value, entry.name)[1] 
          : entry.name

        return (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-black text-sm">
              {displayName}: <span className="font-medium text-black">{displayValue}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
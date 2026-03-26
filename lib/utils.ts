export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`
}

export function getAQICategory(aqi: number): {
  label: string
  color: string
  bgColor: string
} {
  if (aqi <= 50) {
    return { label: 'Good', color: 'text-success-foreground', bgColor: 'bg-success' }
  } else if (aqi <= 100) {
    return { label: 'Moderate', color: 'text-warning-foreground', bgColor: 'bg-warning' }
  } else if (aqi <= 150) {
    return { label: 'Unhealthy for Sensitive', color: 'text-warning-foreground', bgColor: 'bg-warning' }
  } else if (aqi <= 200) {
    return { label: 'Unhealthy', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  } else if (aqi <= 300) {
    return { label: 'Very Unhealthy', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  } else {
    return { label: 'Hazardous', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  }
}

export function getRiskCategory(score: number): {
  label: string
  color: string
  bgColor: string
} {
  if (score <= 30) {
    return { label: 'Low Risk', color: 'text-success-foreground', bgColor: 'bg-success' }
  } else if (score <= 60) {
    return { label: 'Moderate', color: 'text-warning-foreground', bgColor: 'bg-warning' }
  } else if (score <= 100) {
    return { label: 'High Risk', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  } else {
    return { label: 'Very High Risk', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

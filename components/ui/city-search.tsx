'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from './input'
import { MapPin, Loader2, Search } from 'lucide-react'
import type { CitySearchResult } from '@/lib/city-search'

interface CitySearchProps {
  value: string
  onSelect: (city: CitySearchResult) => void
  placeholder?: string
  label?: string
  className?: string
  loading?: boolean
}

export function CitySearch({
  value,
  onSelect,
  placeholder = 'Search any city...',
  label,
  className,
  loading = false,
}: CitySearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<CitySearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)

  // Sync external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Skip search if a city was just selected (query changed programmatically)
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/city-search?q=${encodeURIComponent(query)}&limit=5`)
        const data = await res.json()
        setResults(data.results || [])
        setIsOpen(data.results?.length > 0)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSelect = (city: CitySearchResult) => {
    justSelectedRef.current = true
    setQuery(city.name)
    setResults([])
    setIsOpen(false)
    onSelect(city)
  }

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <Input
        label={label}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        icon={(isSearching || loading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault()
            handleSelect(results[0])
          }
          if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
      />

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((city, i) => (
            <button
              key={`${city.lat}-${city.lon}-${i}`}
              onClick={() => handleSelect(city)}
              className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-start gap-2"
            >
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{city.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {city.state ? `${city.state}, ` : ''}{city.country}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-16 px-6 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm"
    >
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:block w-64">
          <Input
            placeholder="Search..."
            icon={<Search className="w-4 h-4" />}
            className="h-9"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>
      </div>
    </motion.header>
  )
}

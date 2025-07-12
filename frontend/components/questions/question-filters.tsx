"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Filter, TrendingUp, Clock, MessageSquareOff, Star } from "lucide-react"

interface QuestionFiltersProps {
  sortBy: string
  onSortChange: (value: string) => void
  activeFilters?: string[]
  onFilterToggle?: (filter: string) => void
}

export function QuestionFilters({ sortBy, onSortChange, activeFilters = [], onFilterToggle }: QuestionFiltersProps) {
  const filters = [
    { id: "hot", label: "Hot", icon: TrendingUp },
    { id: "new", label: "New", icon: Clock },
    { id: "unanswered", label: "Unanswered", icon: MessageSquareOff },
    { id: "featured", label: "Featured", icon: Star },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Mobile Filter Buttons */}
      <div className="flex flex-wrap gap-2 sm:hidden">
        {filters.map((filter) => {
          const Icon = filter.icon
          const isActive = activeFilters.includes(filter.id)
          return (
            <Button
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterToggle?.(filter.id)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {filter.label}
            </Button>
          )
        })}
      </div>

      {/* Desktop Filters */}
      <div className="hidden sm:flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {filters.map((filter) => {
          const Icon = filter.icon
          const isActive = activeFilters.includes(filter.id)
          return (
            <Badge
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10"
              onClick={() => onFilterToggle?.(filter.id)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {filter.label}
            </Badge>
          )
        })}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="most-voted">Most Voted</SelectItem>
            <SelectItem value="most-answers">Most Answers</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

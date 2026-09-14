"use client"

import Link from "next/link"
import { ArrowRight, GraduationCap, Building2, Gamepad2, Briefcase, Home, Palette, FolderOpen } from "lucide-react"
import type { Collection } from "@/lib/api"
import { useLanguage } from "@/lib/language-context"
import { getLocalizedName } from "@/lib/utils"

const COLLECTION_ICONS = {
  GraduationCap,
  Building2,
  Gamepad2,
  Briefcase,
  Home,
  Palette,
} as const

interface CollectionCardProps {
  collection: Collection
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const { language } = useLanguage()
  const isRtl = language === "ar"
  const IconComponent = (collection.icon && COLLECTION_ICONS[collection.icon as keyof typeof COLLECTION_ICONS]) || FolderOpen

  const name = getLocalizedName(collection.collection_name, language)
  const description = getLocalizedName(collection.description || null, language)
  const gradient = collection.gradient || "from-primary to-primary/80"

  return (
    <Link
      href={`/${language}/collections/${collection.collection_slug}`}
      className="group relative block h-full"
      aria-label={name}
    >
      <div className="relative h-full min-h-[210px] bg-card rounded-xl p-6 border border-border/60 transition-all duration-200 hover:shadow-md hover:border-primary/20 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-200`} aria-hidden="true" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-4 h-full">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm`}>
            <IconComponent className="h-8 w-8 text-white" aria-hidden="true" />
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h3 className="font-semibold text-sm mb-1.5">{name}</h3>
            {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
          </div>

          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
            <span>{language === "ar" ? "استكشف" : "Explorer"}</span>
            <ArrowRight className={`h-3.5 w-3.5 transition-transform ${isRtl ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
  )
}

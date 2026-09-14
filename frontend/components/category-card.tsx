"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Category } from "@/lib/api"
import { getImageUrl, getLocalizedName } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

interface CategoryCardProps {
  category: Category
  productCount?: number
}

export function CategoryCard({ category, productCount }: CategoryCardProps) {
  const { t, language } = useLanguage()
  const categoryName = getLocalizedName(category.category_name, language)

  return (
    <Link
      href={`/store?category=${category.category_slug}`}
      className="group relative bg-card rounded-xl border border-border/60 overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200"
    >
      <div className="aspect-square bg-muted/30 relative overflow-hidden rounded-t-xl">
        <Image
          src={
            category.category_image?.startsWith("http")
              ? category.category_image
              : getImageUrl(`categories/${category.category_image}`)
          }
          alt={categoryName}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{categoryName}</h3>
        {productCount !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">{productCount} {t.category.products}</p>
        )}
        <div className="flex items-center gap-1 text-primary mt-2 text-xs font-semibold">
          <span>{t.home.shopNow}</span>
          <ArrowRight className={`h-3.5 w-3.5 transition-transform ${language === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} aria-hidden="true" />
        </div>
      </div>
    </Link>
  )
}

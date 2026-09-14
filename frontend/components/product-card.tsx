"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { formatPrice, calculateDiscount, getImageUrl, getLocalizedName } from "@/lib/utils"
import type { Product } from "@/lib/api"
import { useLanguage } from "@/lib/language-context"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const { t, language } = useLanguage()

  const discount = product.sale_price
    ? calculateDiscount(product.current_price, product.sale_price)
    : 0

  const effectivePrice = product.sale_price || product.current_price
  const imageUrl = product.images?.[0]?.image_url || '/placeholder.svg'
  const stock = product.total_stock || 0
  const isNew = product.created_at
    ? (Date.now() - new Date(product.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000
    : false

  const displayName = getLocalizedName(product.product_name, language)
  const locale = language === 'ar' ? 'ar' : 'fr'

  return (
    <div className="group bg-card rounded-xl border border-border/60 overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200">
      <div className="relative aspect-square bg-muted/30">
        <Link href={`/${locale}/product/${product.product_id}`}>
          <Image
            src={getImageUrl(imageUrl)}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-5 group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Badges */}
        <div className={`absolute top-3 flex flex-col gap-1.5 ${language === 'ar' ? 'right-3' : 'left-3'}`}>
          {isNew && (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
              {t.product.new}
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Wishlist button */}
        <div className={`absolute top-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 ${language === 'ar' ? 'left-3' : 'right-3'}`}>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-sm shadow-sm border border-border/50 hover:bg-background hover:shadow-md"
            onClick={() => toggleWishlist(product.product_id)}
          >
            <Heart
              className={`h-3.5 w-3.5 ${isInWishlist(product.product_id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{product.brand}</p>
        <Link href={`/${locale}/product/${product.product_id}`}>
          <h3 className="font-medium text-sm leading-snug line-clamp-2 hover:text-primary transition-colors min-h-[2.5rem]">
            {displayName}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold text-foreground">{product.average_rating?.toFixed(1) || '0.0'}</span>
          <span className="text-[11px] text-muted-foreground">({product.review_count || 0})</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-lg font-bold text-primary">{formatPrice(effectivePrice)}</span>
          {product.sale_price && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.current_price)}</span>
          )}
        </div>

        {/* Stock */}
        <p className={`text-xs font-medium ${stock > 0 ? "text-primary" : "text-destructive"}`}>
          {stock > 0 ? `${stock} ${t.product.inStock}` : t.product.outOfStock}
        </p>

        {/* Add to cart */}
        <Button
          className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-sm font-medium rounded-lg"
          onClick={() => addItem(product)}
          disabled={stock === 0}
        >
          <ShoppingCart className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} aria-hidden="true" />
          {t.product.addToCart}
        </Button>
      </div>
    </div>
  )
}

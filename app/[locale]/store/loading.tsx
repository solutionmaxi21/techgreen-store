import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Container from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Container>
          {/* Page Header Skeleton */}
          <div className="py-8 mb-8">
            <Skeleton className="h-9 w-64 mb-3" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>

          {/* Toolbar Skeleton */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <Skeleton className="h-10 w-64" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>

          <div className="flex gap-6">
            {/* Sidebar Skeleton */}
            <div className="hidden lg:block w-64 shrink-0 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Product Grid Skeleton */}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center gap-2 pt-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}

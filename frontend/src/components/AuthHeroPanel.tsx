interface AuthHeroPanelProps {
  title: string
  titleAs?: 'h1' | 'h2'
  overlayOpacity?: number
  brand?: string
}

function buildAuthPanelStyle(overlayOpacity: number) {
  return {
    backgroundImage: `linear-gradient(rgba(33, 27, 30, ${overlayOpacity}), rgba(33, 27, 30, ${overlayOpacity})), url('/talent_background.PNG')`,
    backgroundPosition: 'left center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  }
}

export function AuthHeroPanel({
  title,
  titleAs = 'h1',
  overlayOpacity = 0.62,
  brand = 'SOBHA COMPASS',
}: AuthHeroPanelProps) {
  const HeadingTag = titleAs

  return (
    <section
      className="relative flex min-h-[280px] items-end px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[calc(100vh-72px)] lg:px-12 lg:py-12 xl:px-16"
      style={buildAuthPanelStyle(overlayOpacity)}
    >
      <div className="max-w-md">
        <p className="text-3xl font-semibold tracking-tight text-white drop-shadow">
          {brand}
        </p>
        <HeadingTag className="mt-3 text-2xl font-semibold tracking-tight text-white drop-shadow sm:text-2xl">
          {title}
        </HeadingTag>
      </div>
    </section>
  )
}

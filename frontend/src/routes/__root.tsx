import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import Header from '../components/Header'
import { NotFound } from '../components/NotFound'
import { APP_URL } from '../lib/config'

import appCss from '../styles.css?url'

const appOrigin = APP_URL || 'http://localhost:3020'
const socialPreview = `${appOrigin}/social-preview.png`
const pageTitle = 'SOBHA COMPASS'
const pageDescription =
  'SOBHA COMPASS competency mapping and skill assessment system.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: pageTitle,
      },
      {
        name: 'description',
        content: pageDescription,
      },
      {
        name: 'robots',
        content: 'noindex, nofollow',
      },
      {
        name: 'theme-color',
        content: '#6b141C',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: pageTitle,
      },
      {
        property: 'og:title',
        content: pageTitle,
      },
      {
        property: 'og:description',
        content: pageDescription,
      },
      {
        property: 'og:url',
        content: appOrigin,
      },
      {
        property: 'og:image',
        content: socialPreview,
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: pageTitle,
      },
      {
        name: 'twitter:description',
        content: pageDescription,
      },
      {
        name: 'twitter:image',
        content: socialPreview,
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'canonical',
        href: appOrigin,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo-sobha.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased selection:bg-[rgba(237,237,237,0.2)]">
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  )
}

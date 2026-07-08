import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mr. Boot CRM',
    short_name: 'Mr. Boot',
    description: 'CRM and Order Management for Mr. Boot — Premium Shoe Care & Repair',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#361f1a',
    theme_color: '#361f1a',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
    ],
  }
}

import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mr. Boot CRM',
    short_name: 'Mr. Boot',
    description: 'CRM and Order Management for Mr. Boot Shoe Care',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    orientation: 'portrait',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any maskable'
      },
    ],
  }
}

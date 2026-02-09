# EchoRx - Offline-First Medication Scanner PWA

A Progressive Web App for medication scanning and reminders, built for Nigeria (Yoruba/English) with offline-first architecture.

## Features

- **Pill Scanner**: Camera-based medication identification using Gemini AI
- **Offline Support**: Works without internet using cached data and local OCR fallback
- **Multilingual**: Full Yoruba and English support with text-to-speech
- **Medication Reminders**: Schedule notifications for your medications
- **Pharmacy Locator**: Find nearby pharmacies with offline GeoJSON data
- **Low RAM Optimized**: LRU cache eviction for 1GB RAM devices
- **Accessible**: WCAG 2.1 AA compliant with ARIA labels and keyboard navigation

## Tech Stack

- **Frontend**: Vue.js 3 + TypeScript + Vite
- **PWA**: Workbox (via vite-plugin-pwa)
- **Database**: IndexedDB via Dexie.js
- **Styling**: Custom CSS with glassmorphism design
- **Icons**: FontAwesome
- **AI**: Gemini 2.0 Flash for vision analysis

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- Gemini API key (get one at [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/echorx.git
cd echorx

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Add your Gemini API key to .env
# VITE_GEMINI_API_KEY=your_key_here

# Start development server
bun run dev
```

### Build for Production

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

## Project Structure

```
echorx/
├── public/              # Static assets
│   ├── favicon.svg
│   └── pwa-*.png       # PWA icons
├── src/
│   ├── composables/    # Vue composables
│   │   ├── useCamera.ts
│   │   └── useTTS.ts
│   ├── data/           # Static data
│   │   └── pharmacies-nigeria.json
│   ├── db/             # IndexedDB with Dexie
│   │   └── index.ts
│   ├── i18n/           # Internationalization
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en.json
│   │       └── yo.json
│   ├── services/       # API and business logic
│   │   ├── gemini.ts
│   │   └── ocr-fallback.ts
│   ├── styles/         # Global styles
│   │   └── main.css
│   ├── views/          # Page components
│   │   ├── ScanView.vue
│   │   ├── ScheduleView.vue
│   │   ├── PharmaciesView.vue
│   │   └── SettingsView.vue
│   ├── App.vue         # Root component
│   └── main.ts         # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Gemini API key for AI analysis | Yes |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key (optional) | No |

## Deployment

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/echorx)

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/echorx)

## Offline Capabilities

EchoRx is designed to work offline:

1. **Cached UI**: All pages and assets are cached for offline use
2. **Local Database**: Medications, schedules, and pharmacies stored in IndexedDB
3. **Offline OCR**: Basic medication lookup from local database when offline
4. **Background Sync**: Changes sync when connection is restored

## Accessibility

- Skip links for keyboard navigation
- ARIA labels on all interactive elements
- High contrast color scheme (WCAG 2.1 AA)
- Reduced motion support
- Screen reader tested
- Text-to-speech for medication instructions

## Language Support

Currently supported:
- English (en)
- Yoruba (yo)

The architecture supports modular language packs for future expansion to Kenya (Swahili), India (Hindi), etc.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

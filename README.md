# StreamDeck - Live Sports Streaming Platform

A modern, responsive Next.js application for streaming live sports matches, watching highlights, and getting expert predictions.

## Features

- 🏆 **Live Matches**: Watch live sports streams with multiple source options
- 🔥 **Popular Now**: Browse trending matches with high viewership
- 📅 **Schedule**: View upcoming fixtures and match times
- 🏅 **Leagues**: Browse matches by competition
- 🎬 **Highlights**: Watch match highlights and replays
- 📊 **Predictions**: Get daily football tips with AI-powered predictions
- 💬 **Live Chat**: Real-time chat during matches
- 🌙 **Dark Mode**: Beautiful dark/light theme toggle

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API

## Project Structure

```
app/
├── components/          # Reusable components
│   ├── Header.tsx       # Top navigation bar
│   ├── Sidebar.tsx      # Side navigation
│   ├── MatchCard.tsx    # Match card component
│   ├── LoadingSpinner.tsx
│   ├── MainLayout.tsx   # Main layout wrapper
│   ├── SidebarItem.tsx
│   └── SportSelector.tsx
├── contexts/            # React contexts
│   └── DarkModeContext.tsx
├── data/                # Mock data and constants
│   └── constants.ts
├── page.tsx             # Dashboard/Home page
├── popular/             # Popular matches page
├── schedule/            # Schedule page
├── leagues/             # Leagues page
├── highlights/          # Highlights page
├── predictions/         # Predictions page
└── watch/[id]/          # Watch match page (dynamic route)
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

- `/` - Dashboard with live matches
- `/popular` - Popular/trending matches
- `/schedule` - Match schedule
- `/leagues` - Browse by league
- `/highlights` - Match highlights
- `/predictions` - Daily predictions
- `/watch/[id]` - Watch a specific match

## Components

### Reusable Components

- **MatchCard**: Displays match information with team logos and status
- **Sidebar**: Navigation sidebar with collapsible functionality
- **Header**: Top bar with search and dark mode toggle
- **LoadingSpinner**: Animated loading indicator
- **SportSelector**: Sport type selector (Football, Basketball, etc.)

## Responsive Design

The application is fully responsive and works on:
- Mobile devices (320px+)
- Tablets (768px+)
- Desktop (1024px+)
- Large screens (1800px+)

## Features in Detail

### Live Streaming
- Multiple stream source options
- Live chat integration
- Related matches sidebar
- Video player controls

### Predictions
- Daily match predictions
- Win/loss tracking
- Confidence scores
- Multiple data sources (AI, Experts, Community)

### Highlights
- Featured highlights
- YouTube integration
- Related videos
- Video metadata

## Development

The project uses:
- TypeScript for type safety
- Tailwind CSS for styling
- Next.js App Router for routing
- React Server Components where possible
- Client Components for interactivity

## License

MIT
# ovalve

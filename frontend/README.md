# PlaceOps Frontend

A modern, professional React dashboard for placement management system.

## Features

- **Modern Blue Theme**: Clean, professional design with blue color palette
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Dashboard Overview**: Key metrics, recent activity, and quick actions
- **Placement Drives**: Manage and track placement drives
- **Student Management**: View and manage student profiles
- **Analytics**: Comprehensive placement analytics and insights
- **Settings**: User preferences and account management

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Heroicons** - Beautiful SVG icons
- **Recharts** - Charts and data visualization

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Design System

### Colors
- Primary: Blue (#2563eb)
- Secondary: Light blue variants
- Accent: Gradients and soft shadows
- Background: Light gray (#f8fafc)

### Components
- **Cards**: Rounded corners with soft shadows
- **Buttons**: Gradient backgrounds with hover effects
- **Forms**: Clean inputs with focus states
- **Navigation**: Sidebar with active states

### Animations
- Fade-in animations for page loads
- Hover effects on interactive elements
- Smooth transitions throughout

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Main layout wrapper
│   ├── Sidebar.jsx     # Navigation sidebar
│   ├── Header.jsx      # Top header bar
│   └── ...
├── pages/              # Page components
│   ├── Dashboard.jsx   # Main dashboard
│   ├── Drives.jsx      # Placement drives
│   ├── Students.jsx    # Student management
│   ├── Analytics.jsx   # Analytics and reports
│   └── Settings.jsx    # User settings
├── App.jsx             # Main app component
├── main.jsx           # App entry point
└── index.css          # Global styles
```

## API Integration

The frontend is designed to work with the existing backend API. All API calls should be made through the `/api` proxy configured in Vite.

## Deployment

The app can be deployed to any static hosting service:

1. Build the app: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Configure your server to serve `index.html` for all routes (SPA routing)
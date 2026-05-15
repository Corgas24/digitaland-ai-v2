# Digitaland.ai

A unified API gateway to 60+ AI models. Access GPT-4o, Claude 3.5 Sonnet, Gemini 1.5, Llama 3.1, Mistral, and more through a single OpenAI-compatible endpoint.

## Features

- 🚀 **Unified API** - One API key for 60+ models from OpenAI, Anthropic, Google, Meta, Mistral, Cohere, and more
- 💰 **Transparent Pricing** - Pay-as-you-go with competitive rates and no subscriptions
- 🔌 **OpenAI Compatible** - Drop-in replacement for OpenAI API with just a base URL change
- ⚡ **Lightning Fast** - Global routing with <200ms average response time
- 🎨 **Modern UI** - Beautiful landing page with 3D animations using Three.js
- 📊 **Dashboard** - Manage API keys, track usage, and monitor billing

## Supported Models

### Chat Models
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo, o1-preview, o1-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.0 Pro, Gemini Pro Vision
- **Meta**: Llama 3.1 405B, Llama 3.1 70B, Llama 3.1 8B, Llama 3 70B/8B
- **Mistral**: Mistral Large, Mistral Medium, Mistral Small, Mixtral 8x22B/8x7B, Codestral
- **Cohere**: Command R+, Command R, Command, Command Light
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **xAI**: Grok Beta
- **Perplexity**: Sonar Large, Sonar Medium
- **AI21**: Jamba Instruct, Jurassic-2

### Image Models
- **OpenAI**: DALL·E 3, DALL·E 2
- **Stability AI**: Stable Diffusion XL, Stable Diffusion 3, SDXL Turbo

### Audio Models
- **OpenAI**: Whisper (transcription), TTS (text-to-speech)

### Vision Models
- **Google**: Gemini Pro Vision
- **OpenAI**: GPT-4 Vision (via GPT-4o)

## Tech Stack

- **React 19** - Latest React with modern hooks
- **Vite 8** - Fast build tool and dev server
- **React Router 7** - Client-side routing
- **Three.js** - 3D graphics and animations
- **@react-three/fiber & @react-three/drei** - React renderer for Three.js
- **Lucide React** - Beautiful icon library
- **CSS Variables** - Custom theming system

## Performance Optimizations

✅ React.memo() on all major components to prevent unnecessary re-renders  
✅ Lazy loading with code splitting for optimal bundle size  
✅ Smooth scroll behavior for anchor links  
✅ Error boundary for graceful error handling  
✅ SEO optimized with comprehensive meta tags  
✅ Zero ESLint warnings

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Build for Production

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── components/
│   ├── ErrorBoundary.jsx  # Error handling component
│   ├── Footer.jsx          # Site footer with links
│   ├── Navbar.jsx          # Navigation bar
│   └── Orb.jsx             # 3D animated hero element
├── pages/
│   ├── Dashboard.jsx       # API key management
│   ├── Landing.jsx         # Home page
│   └── Models.jsx          # Model catalog with filters
├── App.jsx                 # Main app with routing
├── main.jsx               # Entry point
└── index.css              # Global styles
```

## Pages

- **/** - Landing page with hero, features, pricing, FAQ
- **/models** - Browse 60+ AI models with search and filters
- **/dashboard** - Manage API keys and view usage stats

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

© 2026 Digitaland.ai - All rights reserved

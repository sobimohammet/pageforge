# 🚀 PageForge

> Describe your product in plain language — Claude writes and designs a complete, production-ready HTML landing page in seconds.

[![Live Demo](https://img.shields.io/badge/Live-Demo-6366f1?style=flat-square)](https://pageforge.vercel.app)
[![Built with Claude](https://img.shields.io/badge/Powered%20by-Claude%20API-8b5cf6?style=flat-square)](https://anthropic.com)

## Features
- AI-generated pages — Claude writes copy, designs layout, styles with Tailwind CSS
- 4 design styles — Startup, Minimal, Corporate, Dark Mode
- 8 accent colours — Indigo, Violet, Blue, Cyan, Emerald, Amber, Rose, Orange
- 8 configurable sections — Hero, Features, How it works, Pricing, Testimonials, FAQ, CTA, Footer
- Live iframe preview with desktop/mobile viewport toggle
- Download as HTML, copy to clipboard, or open in new tab
- Streaming generation with animated progress steps

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Vercel Serverless Function (Node) |
| AI | Anthropic Claude API (Sonnet 4.6) |
| Deploy | Vercel |

## Project Structure
```
pageforge/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── api/
│   └── generate.js
├── vercel.json
├── package.json
├── .gitignore
└── README.md
```

## Getting Started
```bash
git clone https://github.com/sobimohammet/pageforge.git
cd pageforge && npm install
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > .env.local
npx vercel dev
```

## Deploy
Connect GitHub repo to Vercel, add `ANTHROPIC_API_KEY` environment variable.

## License
MIT — *Part of [DEVFOLIO OS](https://devfolio-os.vercel.app) · Built by Sobi Mohamed*
/* ═══════════════════════════════════════════════════════════
   PageForge — api/generate.js
   Vercel Serverless Function
   Takes product config, prompts Claude to write a complete
   HTML + Tailwind landing page, streams it back as SSE.
   ═══════════════════════════════════════════════════════════ */

const Anthropic = require('@anthropic-ai/sdk');

const COLOR_MAP = {
  indigo:  { primary: '#6366f1', hex600: '#4f46e5', hex400: '#818cf8' },
  violet:  { primary: '#8b5cf6', hex600: '#7c3aed', hex400: '#a78bfa' },
  blue:    { primary: '#3b82f6', hex600: '#2563eb', hex400: '#60a5fa' },
  cyan:    { primary: '#06b6d4', hex600: '#0891b2', hex400: '#22d3ee' },
  emerald: { primary: '#10b981', hex600: '#059669', hex400: '#34d399' },
  amber:   { primary: '#f59e0b', hex600: '#d97706', hex400: '#fbbf24' },
  rose:    { primary: '#f43f5e', hex600: '#e11d48', hex400: '#fb7185' },
  orange:  { primary: '#f97316', hex600: '#ea580c', hex400: '#fb923c' },
};

const STYLE_MAP = {
  startup:   'Bold and energetic startup aesthetic: large gradient hero, bright CTAs, dynamic sections with gradient backgrounds, modern rounded corners, generous whitespace.',
  minimal:   'Clean minimal design: white/off-white background, black text, generous whitespace, subtle borders, no gradients, typography-driven hierarchy.',
  corporate: 'Professional corporate design: trustworthy navy/gray palette, clear hierarchy, conservative layout, social proof focus, conservative button styles.',
  dark:      'Sleek dark mode design: dark backgrounds (#0f172a, #1e293b), bright accent colors, neon-style CTAs, developer/tech aesthetic.',
};

function buildPrompt({ name, desc, style, color, sections }) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;
  const s = STYLE_MAP[style] || STYLE_MAP.startup;

  const SECTION_MAP = {
    hero:          '- HERO: Full-width hero with headline, subheadline, CTA button(s), and a visual element using pure CSS/SVG.',
    features:      '- FEATURES: 3-4 feature cards in a grid with icons (emoji or inline SVG), title, and description.',
    'how-it-works':'- HOW IT WORKS: 3-step numbered process section.',
    pricing:       '- PRICING: 2-3 pricing tiers, one highlighted as Popular.',
    testimonials:  '- TESTIMONIALS: 2-3 testimonial cards with name, role, and quote.',
    faq:           '- FAQ: 4-5 questions with answers.',
    cta:           '- CTA BANNER: Full-width call-to-action section with headline and button.',
    footer:        '- FOOTER: Simple footer with product name and copyright.',
  };

  const sectionList = (sections || ['hero','features','cta','footer'])
    .map(s => SECTION_MAP[s] || '')
    .filter(Boolean)
    .join('\n');

  return `You are an expert web developer. Generate a complete single-file HTML landing page.

PRODUCT: ${name}
DESCRIPTION: ${desc}
STYLE: ${s}
ACCENT COLOR: ${c.primary}

SECTIONS:
${sectionList}

RULES:
1. Output ONLY raw HTML starting with <!doctype html>. No markdown, no backticks, no explanation.
2. Use Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
3. Configure Tailwind brand color:
   <script>tailwind.config={theme:{extend:{colors:{brand:{DEFAULT:'${c.primary}',dark:'${c.hex600}',light:'${c.hex400}'}}}}}</script>
4. No external images — use CSS gradients, shapes, or inline SVGs only.
5. Fully responsive with Tailwind responsive prefixes.
6. Include sticky navigation with product name and CTA.
7. Add scroll-behavior:smooth to html element.
8. Write compelling realistic copy — no Lorem Ipsum.
9. The page must look polished and production-ready.

Output the complete HTML now:`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { name, desc, style, color, sections } = req.body;
  if (!name || !desc)               return res.status(400).json({ error: 'name and desc are required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const stream = client.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: buildPrompt({ name, desc, style, color, sections }) }],
    });

    stream.on('text', text => res.write(`data: ${JSON.stringify({ text })}\n\n`));
    await stream.finalMessage();
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[PageForge]', err.message);
    if (res.headersSent) { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); }
    else res.status(500).json({ error: err.message });
  }
};
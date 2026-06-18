# Add a clean `/embed` route for the lead form

## Goal
Give you a minimal URL that renders only the lead form (no header, hero, footer) so it embeds cleanly inside an iframe on any external site.

## What I'll build

1. **New route `src/routes/embed.tsx`**
   - Renders only `<LeadIntakeForm />` centered with transparent background and minimal padding.
   - Own `head()` metadata (noindex so it doesn't compete with the main site in search).
   - Adds a tiny `useEffect` that posts the document height to the parent window whenever it changes (ResizeObserver), so the iframe can auto-grow.

2. **Embed snippet for your website**
   ```html
   <iframe
     id="bba-fit-check"
     src="https://bbafitcheck.lovable.app/embed"
     style="border:0; width:100%; max-width:720px; display:block;"
     title="BBA Fit Check"
     loading="lazy"
     scrolling="no">
   </iframe>
   <script>
     window.addEventListener('message', (e) => {
       if (e.origin !== 'https://bbafitcheck.lovable.app') return;
       if (e.data && e.data.type === 'bba-embed-height') {
         document.getElementById('bba-fit-check').style.height = e.data.height + 'px';
       }
     });
   </script>
   ```

## Notes
- The main `/` route is untouched — you still have the full landing page.
- `/embed` is safe to share as a standalone link too.
- If you want a fixed-height iframe instead of auto-resize, you can drop the `<script>` and just set `height="950"`.

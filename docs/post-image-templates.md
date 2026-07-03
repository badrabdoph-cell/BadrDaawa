# Post Image Templates

The post image system is built so new templates can be added without changing the generation flow, storage flow, admin controls, or order wizard logic. A template owns its visual design only. The platform owns selection, signatures, QR generation, file storage, Open Graph variants, admin actions, backup/restore coverage, and deletion cleanup.

## Template Contract

Each template lives in `lib/post-image/templates/` and exports one `PostImageTemplate`.

Required parts:

- `id`: Stable template id. Never reuse an id for a visually incompatible template.
- `name`: Human readable admin and wizard label.
- `PostImageTemplate.manifest`: Metadata used by the picker and future integrations.
- `defaultSize`: The main sharing size. Today this is `portrait-4x5`.
- `supportedSizes`: Every size the renderer can draw, including `portrait-4x5` and `open-graph`.
- `renderSvg(payload)`: Pure renderer that returns an SVG string for the requested payload and size.

The renderer must not save files, query the database, generate QR codes, or decide whether regeneration is needed. Those jobs belong to the generator and service layers.

## Adding a Template

1. Create `lib/post-image/templates/my-template.ts`.
2. Define the supported sizes. Include `portrait-4x5` for the main post image and `open-graph` for link previews.
3. Export a `PostImageTemplate` with `manifest`, `defaultSize`, `supportedSizes`, and `renderSvg(payload)`.
4. Use shared helpers from `lib/post-image/svg-utils.ts`, `lib/post-image/layout.ts`, and `lib/post-image/font.ts` instead of duplicating escaping, data URL, text fitting, safe area, or font logic.
5. Add the template to `lib/post-image/registry.ts`.
6. Add a compact React preview in `components/post-image/template-previews.tsx`.
7. Run the post image tests and visual QA in the wizard and admin panel.

## Payload Rules

Use only existing invitation data:

- Groom name.
- Bride name.
- Cover image.
- Wedding date.
- Invitation URL.
- QR code data URL supplied by the generator.

Do not add customer-facing fields for a template unless the product flow explicitly changes.

## Size Rules

Render from `payload.size`, not hard-coded canvas dimensions.

Current core sizes:

- `portrait-4x5`: `1080 x 1350`, saved as the main post image.
- `open-graph`: `1200 x 630`, saved for link previews and future sharing integrations.

Future sizes should be added to `supportedSizes` and handled inside the same `renderSvg(payload)` function.

## Quality Checklist

Before release:

- The template is registered in `lib/post-image/registry.ts`.
- The template has a preview in `components/post-image/template-previews.tsx`.
- Text stays inside the canvas with long Arabic and mixed Arabic/Latin names.
- The cover image keeps a professional crop across portrait and landscape photos.
- The QR code has enough quiet space and remains scannable.
- The template works for `portrait-4x5` and `open-graph`.
- The template does not add generation logic to wizard or admin UI.
- The template passes automated tests and visual QA on desktop and mobile widths.

# Explore Everywhere

A focused location-search experience built with Next.js, React, and TypeScript. The homepage combines a dark map-inspired presentation with an accessible location typeahead backed by the OpenStreetMap Nominatim search API.

## Requirements

- Node.js 20 or newer
- pnpm 10 (the repository pins `pnpm@10.12.1`)

## Getting started

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Available commands

```bash
pnpm dev        # Start the development server
pnpm build      # Create a production build
pnpm start      # Serve the production build
pnpm test       # Run the Vitest test suite once
pnpm test:watch # Run Vitest in watch mode
pnpm lint       # Check the code with oxlint
pnpm lint:fix   # Apply available oxlint fixes
```

## How search works

- Queries are trimmed and only sent after at least two characters are entered.
- Requests are debounced by 300 ms and previous requests are aborted when a newer query starts.
- Results are cached in memory for the current browser session.
- The typeahead supports mouse selection, Arrow Up/Down navigation, Enter selection, and Escape to close the list.
- Loading, empty, and network-error states are announced through an accessible live region and shown in the listbox.
- Selecting a result displays its label and latitude/longitude below the input.

Search requests use the public [Nominatim API](https://nominatim.org/release-docs/latest/api/Search/) and request up to six results per query.

## Project structure

```text
app/
├── _components/LocationTypeahead.tsx  # Search UI and request lifecycle
├── _config/search.ts                   # Search endpoint and behavior constants
├── _hooks/useDebouncedValue.ts         # Generic debounce hook
├── _tests/LocationTypeahead.spec.tsx   # Interaction and request-race tests
├── globals.css                         # Landing page and typeahead styling
├── layout.tsx                          # Application metadata and root layout
└── page.tsx                            # Homepage composition
public/map-background-image.jpg         # Homepage background asset
search.types.d.ts                       # Shared search result and status types
```

## Testing

The test suite covers stale-response protection, keyboard navigation and selection, request failures, and the minimum query-length rule.

```bash
pnpm test
```

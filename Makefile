.PHONY: dev check build

# Run the course at http://localhost:5173
dev:
	npm install
	npm run dev

# Type-check + unit tests (every step builds in TS and JS mode)
check:
	npm run typecheck
	npm test

# Production build into dist/
build:
	npm run build

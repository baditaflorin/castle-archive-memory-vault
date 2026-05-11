.DEFAULT_GOAL := help

NPM ?= npm

.PHONY: help install install-hooks dev build pages-preview test test-watch test-e2e \
        smoke lint fmt fmt-check clean release-tag

help:  ## Show this help.
	@awk 'BEGIN {FS = ":.*##"; print "Targets:\n"} /^[a-zA-Z_-]+:.*##/ { printf "  %-18s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install:  ## Install npm dependencies.
	$(NPM) install

install-hooks:  ## Wire .githooks via core.hooksPath.
	$(NPM) run hooks:install

dev:  ## Run the Vite dev server.
	$(NPM) run dev

build:  ## Build the SPA into docs/ for GitHub Pages.
	$(NPM) run build

pages-preview:  ## Serve docs/ exactly as GitHub Pages would.
	$(NPM) run pages-preview

test:  ## Run unit tests.
	$(NPM) test

test-watch:  ## Run unit tests in watch mode.
	$(NPM) run test:watch

test-e2e:  ## Run Playwright e2e tests against the built preview.
	$(NPM) run test:e2e

smoke:  ## Build + serve + e2e in one command.
	$(NPM) run smoke

lint:  ## ESLint + tsc --noEmit.
	$(NPM) run lint

fmt:  ## Prettier write.
	$(NPM) run fmt

fmt-check:  ## Prettier check.
	$(NPM) run fmt:check

clean:  ## Remove build artifacts (keeps committed docs/*.md).
	rm -rf node_modules/.vite dist dist-data .cache .tmp
	find docs -mindepth 1 -maxdepth 1 \( -name 'assets' -o -name 'index.html' -o -name '*.svg' -o -name 'coi-serviceworker.js' -o -name '404.html' \) -exec rm -rf {} +

release-tag:  ## Tag the current commit as the next semver (set VERSION=vX.Y.Z).
	@test -n "$(VERSION)" || (echo "Usage: make release-tag VERSION=v0.2.0" && false)
	git tag -a "$(VERSION)" -m "Release $(VERSION)"
	@echo "Tagged $(VERSION). Push with: git push origin $(VERSION)"

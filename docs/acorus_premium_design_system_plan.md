# Acorus Premium Design System Plan

## Goal

Unify Acorus Wallet into one white/purple premium product shell across the web app and Chrome extension while preserving existing wallet, market, swap, and approval behavior.

## Current UI Issues

- Global CSS still had dark-theme root variables and older card surfaces, while newer pages tried to render as light surfaces.
- Swap, Explore, token detail, and extension popup used slightly different panel treatments, button shadows, and text contrast.
- Loading and empty states were uneven, especially on Explore and market discovery surfaces.
- The swap card was functional, but it did not yet feel like the central wallet trading component.

## Target Style

- Milk-white page background with restrained violet/pink/blue accents.
- Rounded glass cards with readable slate text and consistent borders.
- Gradient primary buttons, white secondary buttons, small network/status pills, and shimmer skeletons.
- Product screens should feel close to modern Uniswap-style research/trade flows without copying Uniswap brand, text, logos, or CSS.

## Components

- `PremiumCard`
- `GradientButton`
- `NetworkPill`
- `MetricCard`
- `StatusBanner`
- `getSwapCtaLabel`
- `/design-system` smoke page

## Page Scope

- Home page: premium wallet + swap shell first.
- Swap composer: cleaner central swap card and deterministic CTA labels.
- Token detail: stronger action cluster and readable breadcrumbs.
- Explore: richer rows, volume column, loading skeletons.
- Extension popup: same white/purple skin as the site.

## Non-Scope

- No automatic real swap execution.
- No new seed/private-key handling.
- No provider key changes.
- No WalletConnect execution.

# PROJECT_CONTEXT.md

Last updated: 2026-04-25

## Overview
HandyCall is a Riyadh home-services marketplace. The public site is consumer-first, while the authenticated product supports pros, customers, and platform admins.

## Runtime Architecture
- frontend: Next.js in `packages/web`
- backend: NestJS in `packages/backend`
- shared contracts: `packages/shared`
- storage: S3
- database: DynamoDB
- production:
  - Vercel for web
  - Fly.io for backend API

## Major Product Surfaces
- consumer: landing page, categories, search, provider profiles, request entry points
- pro: registration, onboarding, marketplace profile, inbox, requests, payments
- customer: requests, bookings, inbox, payments
- admin: approvals, settings, subscriptions, usage, audit logs

## Current Backend Modules
- `auth`
- `pros`
- `pro-services`
- `marketplace`
- `bookings`
- `reviews`
- `customers`
- `payments`
- `dashboard`
- `admin`
- `audit-logs`
- `email`
- `scheduling`

## Security Model
- JWT/NextAuth-backed authenticated web flows
- explicit public-route allowlisting through the web proxy
- route-level backend rate limiting
- admin role enforcement
- metadata-only audit logs
- webhook signature verification and replay protection

## Cleanup Decisions
- `_voice-ai/` was removed from the active repo path.
- AWS EB and Amplify deploy artifacts are no longer authoritative.
- stale archive-only folders and side projects were removed so the repo reflects the live marketplace stack.

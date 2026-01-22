# PMP Private Test Exporter

A monorepo for crawling private test sites, extracting questions, and exporting them to PDF.
Built with Next.js, NestJS, Playwright, and Prisma.

## Prerequisites

- Node.js 18+
- pnpm
- Docker (optional, for Redis)

## Setup

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**
   Copy `.env.example` to `.env` in the root (or rely on the workspace behavior, but best to have local envs).
   Ensure `apps/api/.env` has `DATABASE_URL="file:./dev.db"`.

3. **Database**
   Initialize the SQLite database:

   ```bash
   pnpm db:migrate
   ```

4. **Start Development**
   ```bash
   pnpm dev
   ```

   - Web: http://localhost:3000
   - API: http://localhost:3001
   - API Docs: http://localhost:3001/docs
   - Prisma Studio: `pnpm db:studio`

## Self-Check / Usage Guide

1. **Start Crawl**:
   - Go to http://localhost:3000.
   - Enter your `Login URL` and `Test URL`.
   - Select "Auto" mode.
   - Click "Start Extraction".

2. **Monitor**:
   - Watch the progress bar updates (polling API).
   - Wait for "DONE" status.
   - You will be redirected to the Test Detail page.

3. **Verify Data**:
   - Check that questions and choices are displayed on the page.
   - Use the "With Explanations" toggle to verify explanation extraction.

4. **Export**:
   - Click "Download PDF".
   - A PDF formatted for A4 printing should download.

## Architecture

- **apps/web**: Next.js 14, Tailwind, React Query.
- **apps/api**: NestJS, Prisma, Playwright.
- **packages/shared**: Zod schemas and TypeScript interfaces.

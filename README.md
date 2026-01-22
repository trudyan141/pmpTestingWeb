# PMP Test Exporter 🚀

A powerful monorepo solution designed to crawl private e-learning platforms, extract test questions with high precision, and export them into professional, printer-friendly PDFs.

## 🌟 Core Features

- **Hybrid Manual Crawl**: Launch a controlled browser for manual login and navigation. Once you reach the "Review Answers" page, trigger the deep extraction with one click.
- **Smart Metadata Labeling**: Assign **Topic Names** and **Test Names** before crawling. These labels are preserved in the UI and automatically included in the PDF headers.
- **Printer-Friendly PDF Export**:
  - **Clean Theme**: Elegant black-on-white design to save ink and maximize readability.
  - **Guaranteed Ordering**: Questions are strictly sorted by their original index (1, 2, 3...).
  - **Answer Highlighting**: Correct answers are marked with **Bold Text** and a checkmark (✔) indicator.
  - **Custom Filenames**: Exports are named intelligently: `TestName_TopicName_YYYY-MM-DD.pdf`.
- **Live Extraction Preview**: Watch questions appear in real-time on the dashboard as the crawler processes them.
- **Session Persistence**: Each crawl creates a fresh session, ensuring no data mixing between different tests.

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TailwindCSS, Shadcn/UI, TanStack Query.
- **Backend**: NestJS, Prisma (SQLite), Playwright (Automation & PDF Generation).
- **Monorepo Management**: Turborepo, pnpm workspaces.
- **Infrastructure**: Docker & Redis support.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or later.
- **pnpm**: `npm install -g pnpm`.
- **Docker**: Optional (required if using Redis features).

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/trudyan141/pmpTestingWeb.git
cd pmpTestingWeb

# Install dependencies
pnpm install
```

### 2. Database Setup

```bash
# Generate Prisma client and push schema to SQLite
pnpm db:migrate
```

### 3. Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_LOGIN_URL=https://elearning.vnpmi.org/Customer/Login
```

### 4. Running Locally

```bash
# Start both Web and API in development mode
pnpm dev
```

- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:3001](http://localhost:3001)

---

## 🐳 Deployment (Recommended)

### Using Docker (Backend)

Since the backend requires Playwright browser binaries, we recommend using Docker for deployment on VPS or platforms like Railway.

```bash
# Build and run using Docker Compose
docker-compose up -d --build
```

This will start:

1. **API Server**: Port 3001 (includes Playwright & Chromium).
2. **Redis**: Port 6379 for job queuing.
3. **SQLite**: Persistent database stored in `apps/api/prisma`.

### Frontend (Vercel)

1. Link your GitHub repo to Vercel.
2. Set the **Root Directory** to `apps/web`.
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Path to your deployed API (e.g., `https://api.yourdomain.com`).

---

## 📖 Usage Guide

1. **Launch**: Open the Web UI and click **"Open Browser"**.
2. **Login**: In the newly opened Chromium window, log in to your e-learning platform manually.
3. **Navigate**: Go to the **"Review Answers"** page where the list of questions is visible.
4. **Trigger**: Back in the Web UI, enter the **Topic** and **Test Name**, then click **"CRAWL DATA"**.
5. **Download**: Once extraction hits 100%, click the purple **"Download PDF Export"** button.

---

## 🤝 Contributing

Feel free to open issues or submit PRs to improve extraction logic or PDF styling!

**Developed by Antigravity x TrungLK**

# Personal Project Tracker

A simple web app to organize and track projects from university, personal learning, experiments, and other areas.

## Features
- Create and manage custom topics and projects
- Track project status, technologies, descriptions, and links
- Search and filter projects
- Supabase authentication and cloud database
- Export all project data as JSON backups

## Tech Stack
- React + Vite
- Supabase (Authentication & PostgreSQL)
- JavaScript
- CSS

## Getting Started

```bash
git clone YOUR_REPOSITORY_URL
cd project-tracker
npm install
```

Create a `.env.local` file using `.env.example` and add your Supabase project URL and publishable key.

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Purpose

Built to maintain a record of my projects throughout university and make it easier to prepare a professional portfolio and CV in the future.

## Security

Never commit `.env.local` or secret keys. Configure Supabase Row Level Security to protect user data.

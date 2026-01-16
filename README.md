# SteadyThere - Event Planning Management

A multi-tenant SaaS event planning application with AI-powered milestone generation, team collaboration, and comprehensive role-based access control.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **AI**: Anthropic Claude for milestone generation
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## Features

- Multi-tenant organization management
- AI-powered event milestone generation
- Template system with version tracking
- Role-based access control (5 roles)
- Team invitations via email
- Real-time notifications

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Supabase account
- A Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd steadythere
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your Supabase credentials:
   - `VITE_SUPABASE_PROJECT_ID`: Your Supabase project ID
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:dev` | Build with development mode |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Deployment

### Vercel Deployment

1. **Connect your GitHub repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure environment variables in Vercel**
   - Go to Project Settings > Environment Variables
   - Add the following variables for each environment (Production/Preview/Development):
     - `VITE_SUPABASE_PROJECT_ID`
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`

3. **Deploy**
   - Vercel will automatically deploy on push to `main` branch
   - Preview deployments are created for pull requests

### Custom Domain Setup

1. Go to Project Settings > Domains in Vercel
2. Add your custom domain
3. Configure DNS records as instructed by Vercel

## Supabase Configuration

### Edge Functions

The app uses Supabase Edge Functions for:
- `ai-generate`: AI-powered milestone generation using Claude
- `send-invitation`: Email invitations for team members

**Required secrets for Edge Functions** (set in Supabase Dashboard > Edge Functions > Secrets):
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `RESEND_API_KEY`: (Optional) Resend API key for email delivery
- `EMAIL_FROM`: Sender email address
- `APP_URL`: Your application URL

### Database Migrations

Migrations are located in `supabase/migrations/`. To apply migrations to a new Supabase project:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

## Environment Setup for Dev/Prod

### Development Environment
- Use a separate Supabase project for development
- Set `APP_URL` to `http://localhost:8080` in Edge Function secrets

### Production Environment
- Use your production Supabase project
- Set `APP_URL` to your production domain
- Ensure all Edge Function secrets are configured

### GitHub Secrets for CI/CD

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Project Structure

```
src/
├── components/     # React components
│   ├── ui/         # shadcn/ui components
│   ├── layout/     # Layout components
│   └── ...         # Feature components
├── pages/          # Page components (routes)
├── hooks/          # Custom React hooks
├── contexts/       # React contexts (Auth, etc.)
├── lib/            # Utility functions
├── types/          # TypeScript types
└── integrations/   # Third-party integrations
    └── supabase/   # Supabase client & types

supabase/
├── functions/      # Edge Functions
└── migrations/     # Database migrations
```

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

Tests are located alongside their source files or in the `src/test/` directory.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure tests pass: `npm run test`
4. Ensure linting passes: `npm run lint`
5. Create a pull request

## License

Private - All rights reserved

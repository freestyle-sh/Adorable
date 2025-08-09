<p align="center">
  <img src="icon.png" alt="description" width="75">
</p>

# Adorable

Open-source version of **Lovable** - an AI agent that can make websites and apps through a chat interface.

For guidance on building app builders with AI, see the [Freestyle guide on Building an App Builder](https://docs.freestyle.sh/guides/app-builder).

## Features

- Chat interface for interacting with AI code assistants
- Patch-based code editing with user approval
- Git integration for version control
- Preview capabilities for code changes

## Setup Instructions

### Dependencies

- Node.js
- PostgreSQL database ([Neon](https://neon.tech) is easy and has a good free tier)
- Redis (for caching and session management)
- Anthropic API key
- Freestyle API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/freestyle-sh/adorable
   cd adorable
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Get a Freestyle API key

   Head to [our API keys page](https://admin.freestyle.sh/dashboard/api-tokens) to get yours. We're totally free to use right now!

4. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/adorable

   # Anthropic API
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Freestyle API
   FREESTYLE_API_KEY=your_freestyle_api_key
   ```

5. Initialize the database:

   ```bash
   npx drizzle-kit push
   ```

6. Set up Redis

The easiest way to run Redis locally is with Docker:

```bash
docker run --name adorable-redis -p 6379:6379 -d redis
```

This will start a Redis server on port 6379. If you already have Redis running, you can skip this step.

Add the following to your `.env` file (if not already present):

```env
REDIS_URL=redis://localhost:6379
```

6. Set up [Stack Auth](https://stack-auth.com)

Go to the [Stack Auth dashboard](https://app.stack-auth.com) and create a new application. In Configuration > Domains, enable `Allow all localhost callbacks for development` to be able to sign in locally.

You'll need to add the following environment variables to your `.env` file:

```env
NEXT_PUBLIC_STACK_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<your-publishable-client-key>
STACK_SECRET_SERVER_KEY=<your-secret-server-key>
```

7. Add a Preview Domain (optional)

Go to the [Freestyle dashboard](https://admin.freestyle.sh/dashboard/domains) and verify a new domain. Then follow the [DNS Instructions](https://docs.freestyle.sh/web/deploy-to-custom-domain) to point your domain to Freestyle.

Finally, add the following environment variable to your `.env` file:

```env
PREVIEW_DOMAIN=<your-domain> # formatted like adorable.app
```

8. Add Morph for Fast Apply (optional)

Get a Morph API key from [morphllm.com](https://morphllm.com) and add it to your `.env` file to enable the fast edit tool:

```env
MORPH_API_KEY=<your-morph-api-key>
```

This automatically enables the Morph fast edit tool which provides faster code modifications.

9. Run the development server:

   ```bash
   npm run dev
   ```

10. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Developer Documentation

- [Forking Guide](./docs/forking.md) - Comprehensive guide for developers working with this codebase

## Deployment

For production deployment:

```bash
npm run build
npm run start
```

Or use the included deployment script:

```bash
./deploy.sh
```

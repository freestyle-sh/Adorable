# Adorable

Open-source version of **Lovable** - an AI agent that can make websites and apps through a chat interface.

## Features

- Chat interface for interacting with AI code assistants
- Patch-based code editing with user approval
- Git integration for version control
- Preview capabilities for code changes

## Setup Instructions

### Prerequisites

- Node.js
- PostgreSQL database ([Neon](https://neon.tech) is easy and has a good free tier)
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

6. Set up [Stack Auth](https://stack-auth.com)

Go to the [Stack Auth dashboard](https://app.stack-auth.com) and create a new application. In Configuration > Domains, enable `Allow all localhost callbacks for development` to be able to sign in locally.

You'll need to add the following environment variables to your `.env` file:

```env
NEXT_PUBLIC_STACK_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<your-publishable-client-key>
STACK_SECRET_SERVER_KEY=<your-secret-server-key>
```

7. Enabling Integrations via [OpenInt](https://openint.dev) (optional)

Go to the [OpenInt Console](https://openint.dev), create a new project and configure any desired integrations. You can enable integrations by setting the `OPENINT_API_KEY` environment variable in your `.env` file.

8. Add a Preview Domain (optional)

Go to the [Freestyle dashboard](https://admin.freestyle.sh/dashboard/domains) and verify a new domain. Then follow the [DNS Instructions](https://docs.freestyle.sh/Getting-Started/deploy-to-custom-domain#all-subdomains-of-a-domain) to point your domain to Freestyle.

Finally, add the following environment variable to your `.env` file:

```env
PREVIEW_DOMAIN=<your-domain> # formatted like adorable.app
```

9. Run the development server:

   ```bash
   npm run dev
   ```

10. Open [http://localhost:3000](http://localhost:3000) in your browser.

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

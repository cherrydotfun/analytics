# cherry.fun

## Overview

cherry.fun helps traders spot real opportunities and avoid scams on Solana. It provides a suite of tools to analyze and track Solana tokens and wallets, including:

- Wallet analytics: find hidden links between wallets and organise them into groups.
- Token analytics: track token movements and identify potential scams.
- Holder analytics: analyze the distribution of token holders and their activity.
- Custom cluster analysis: create custom clusters of wallets and tokens for deeper analysis.
- Visualization tools: visualize wallet and token data in an easy-to-understand format.

## Tech Stack

- [React](https://reactjs.org/)
- [Next.js](https://nextjs.org/)
- [Node.js](https://nodejs.org/) (v22.11.0+)
- [Yarn](https://yarnpkg.com/) (v1.22.22+)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## Installation & Setup

1. **Clone the repository:**

   ```sh
   git clone git@github.com:cherrydotfun/app.git cherry-web
   cd cherry-web
   ```

2. **Install dependencies:**

   ```sh
   npx yarn install
   ```

3. **Configure environment variables:**
   - Copy `env.example` to `.env.local` and update values as needed.
   ```sh
   cp env.example .env.local
   ```

## Development

Start the development server:

```sh
npx yarn dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

To run the app with a different port (for example, `4000`), use:

```sh
npx yarn dev --port 4000
```

## Production

Install all dependencies and build the app:

```sh
npx yarn install
```

To run the app in production mode, you need to build it first. This will create an optimized version of your app in the `.next` directory.

Build and start the production server:

```sh
npx yarn build
npx yarn start
```

## Environment Variables

Environment variables are managed via the `.env.local` file. See `.env.example` for required variables.

## Folder Structure

```
/cherry-web/src/
├── app/               # Next.js app routed components
        ├── api/       # API endpoints
├── components/        # Reusable React components
├── public/            # Static assets
├── lib/               # Utility functions
├── hooks/             # Custom React hooks
├── types/             # Shared TypeScript types
├── env.example        # Example environment variables
├── package.json
└── ...
```

## Scripts

- `npx yarn dev`: Start dev server
- `npx yarn build`: Build for production
- `npx yarn start`: Start production server

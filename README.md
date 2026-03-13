# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Backend Auth API (Cloud Ready)

This project includes an auth API at [server/index.mjs](server/index.mjs) with:

- Database-backed sign up/sign in
- Bcrypt password hashing
- JWT token auth
- `/api/users/me` profile APIs
- `/api/users` and `/api/users/:userId` for user discovery

### Modern Auth & Database Setup (Recommended)

The most robust way to run the platform is using **Docker**. This ensures the PostgreSQL database and API are configured perfectly for you.

1. **Install Docker Desktop** (if you haven't already).
2. **Start the Platform**:
   ```sh
   docker compose up --build
   ```
   This will spin up:
   - **PostgreSQL Database** (Container: `ap-innovate-db`)
   - **Auth API Server** (Container: `ap-innovate-api`)

3. **Open the App**:
   Navigate to `http://localhost:8080` in your browser.

---

### Manual / Local Run

If you prefer to run the API directly on your host machine:

1. **Start only the Database**:
   ```sh
   docker compose up -d db
   ```
2. **Start the API**:
   ```sh
   npm run api
   ```
3. **Start the Frontend**:
   ```sh
   npm run dev
   ```

### Cloud Deployment Notes

- Set `JWT_SECRET` to a long random secret.
- Set `CORS_ORIGIN` to your frontend domain.
- Set `DATABASE_URL` to your managed Postgres instance.
- Set `PGSSL=true` when provider requires SSL.
- Set frontend `VITE_API_BASE_URL` to your deployed API URL.

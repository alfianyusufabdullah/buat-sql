# Buat SQL - Database Diagram Builder

Buat SQL is a powerful, local-first database diagram builder inspired by DrawSQL. It allows developers to visualize schemas, manage relationships, and export SQL scripts directly from their browser with a sleek, premium interface.

## 🚀 Key Features

- **Interactive ERD Builder**: Effortlessly create and organize database tables with a intuitive drag-and-drop interface.
- **Visual Relationships**: Define foreign key relationships visually with smart arrow routing.
- **Column & Enum Management**: Powerful dialogs for adding and editing columns, types, and custom enumerations.
- **SQL Schema Export**: Export your diagrams instantly to PostgreSQL, MySQL, and SQLite dialects.
- **Local Persistence**: All your diagrams are stored locally using SQLite and Drizzle ORM.
- **Premium Design**: Built with a modern, glassmorphic aesthetic using Tailwind CSS and Radix UI.

## 🛠️ Tech Stack

- **Framework**: [React Router 7](https://reactrouter.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [SQLite](https://sqlite.org/) (via `better-sqlite3`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Utilities**: `lucide-react`, `react-xarrows`, `react-draggable`

## 🏁 Getting Started

### Prerequisites

- Node.js (v20 or later recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd buat-sql
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup the database:
   ```bash
   # This will create the local sqlite.db and apply migrations
   npx drizzle-kit migrate
   ```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## 📦 Deployment

### Production Build

Create a production-ready build:

```bash
npm run build
```

The output will be located in the `build/` directory, separated into `client/` and `server/`.

### Docker

A `Dockerfile` is included for containerized deployment. To build and run:

```bash
docker build -t buat-sql .
docker run -p 3000:3000 buat-sql
```

## 📄 License

This project is open-source and available under the MIT License.

---

Built with ❤️ for developers who love clean architecture.

# 🎯 Social Engineering Simulation Platform

This platform simulates phishing attacks to help organizations assess employee awareness and response to social engineering threats.

---

## 🚀 Features

- **Containerized Architecture:** Easily deploy the app using Docker and Docker Compose.
- **MySQL Database Support:** Managed via Docker volume for persistence.
- **JWT Authentication:** Secure login with access and refresh tokens.
- **Dual Servers:**
  - `api (server)`: Platform backend (user management, campaigns, statistics)
  - `phishing (phishing-server)`: Handles phishing campaign links separately for realism.
- **User Management:** Admin user is created at startup using environment variables.
- **Campaign Scheduling:** Launch campaigns with timezone-aware scheduling.
- **Redis Integration:** Used for email sending queue (containerized).

---

## ⚙️ Requirements

| Tool / Component | Source |
|------------------|--------|
| Docker              | [Download](https://www.docker.com/products/docker-desktop/) |
| Docker Compose | [Documentation](https://docs.docker.com/compose/) |

## 📦 Getting Started

---

### 1. Clone the Repository

```bash
git clone https://github.com/razvaniordan/Social-engineering-application.git
cd Social-engineering-application
```

---

## 2. Environment Configuration (.env)

Before running the application, you must configure the environment variables. A template file named `.env.example` is provided in the root directory. To get started:

1. **Duplicate the file:**
   Rename `.env.example` to `.env`

2. **Edit the `.env` file** to include your custom settings:

---

### 👤 Admin Credentials (used to log in to the platform)
- `USERNAME`: Admin username for the initial platform login.
- `PASSWORD`: Admin password. If unchanged and the user already exists, a message will display that the password was updated (even if the value didn’t change).
- `DROP_DB`: Set to `true` if you want to drop **all** database tables and reinitialize them on app start. Recommended for fresh starts only.
- `DROP_USER_DB`: Set to `true` to drop and recreate only the `Users` table. Useful for refreshing user credentials without affecting campaign data.

---

### 🗄️ MySQL Database Configuration
- `DB_NAME`: Name of the MySQL schema (should match `MYSQL_DATABASE` in docker-compose).
- `DB_USER`: MySQL username (e.g., `root`).
- `DB_PASS`: Password for MySQL user (should match `MYSQL_ROOT_PASSWORD` in docker-compose).
- `DB_HOST`: Hostname for the database.
  - Use `mysql` if running via Docker (Docker DNS will resolve it).
  - Use `127.0.0.1` or `localhost` if running locally.
- `DB_PORT`: Set to `3306` (default internal MySQL port). Even if port `3307` is mapped on host, containers must use `3306`.

---

### 🧠 Redis Configuration (for email tracking jobs)
- `REDIS_URL`: Redis connection URL.
  - Use `redis://redis:6379` for Docker-based development.
  - Use `redis://127.0.0.1:6379` for local (non-Docker) setups.

---

### 🌐 Application Ports
- `SERVER_PORT`: Port on which the main Express server runs (default: `3000`).
- `PHISHING_PORT`: Port for the phishing simulation server (default: `4000`).

---

### 🔐 JWT Secret Keys (Token Security)
You must generate two different secure 128-character hex strings (64 random bytes) for token signing:

- **Option 1: Local Node.js (if installed):**
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- **Option 2: Inside Docker (no Node.js required locally):**
  ```bash
  docker run --rm node:20-alpine node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

Then copy the generated values into the following fields:

- `ACCESS_TOKEN_SECRET`: Used for access tokens.
- `REFRESH_TOKEN_SECRET`: Used for refresh tokens.

---

Once your `.env` file is complete, you’re ready to proceed with running the application via Docker or locally.

---

### 3. Build and Start the Application

```bash
docker compose up --build
```

This will:
- Start MySQL, Redis, and both servers.
- Run `initdb.js` in the `db-init` container to create tables and the admin user (if not already created).

---

### 4. Access the Platform

- **Platform UI:** [http://localhost:3000](http://localhost:3000)
- **Phishing Link Handler:** [http://localhost:4000](http://localhost:4000)

Log in using the `USERNAME` and `PASSWORD` from your `.env`.

---

## 🔁 Reset Options

You can control data resets via `.env` flags:

| Variable        | Description                                |
|----------------|--------------------------------------------|
| `DROP_DB=true` | Recreates the full database schema         |
| `DROP_USER_DB=true` | Clears only the Users table         |

To apply these:

```bash
docker compose down -v
docker compose up --build
```

---

## 📧 Email Campaigns (via Redis)

The platform queues email sends using Redis.

✅ No need to manually install Redis – it runs in a Docker container.

⚠️ When configuring a Sending Profile (SMTP), use an **App Password** (third-party password) for the email account. Never use your actual email login password (it won't work).

---

## 🛡️ Security Considerations

- JWT secrets are mandatory and must be securely generated.
- Access tokens are short-lived; refresh tokens are stored safely in the DB.
- Environment variables are used to define initial admin credentials.
- MySQL DB is stored persistently in a Docker volume.

---

## 📄 Phishing Campaign Templates Disclaimer

The application includes several pre-defined templates for emails and phishing pages, used during simulated phishing campaigns. These templates:

- Were fully functional and visually accurate at the time they were added.
- Serve only as **demonstration samples** to showcase the platform’s capabilities.

⚠️ **Important:**

- These templates may no longer perfectly replicate the original websites if the source websites have changed or updated their layout or structure.
- The included email and site templates are **not editable by end users**.
- Cloning or updating these templates to reflect newer site versions is **the responsibility of the developer** maintaining the application.

Use the existing templates strictly for internal testing and awareness simulations.

---

## 📚 License

This project is released under the [MIT License](LICENSE).



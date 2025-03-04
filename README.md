# Social Engineering Application

This platform simulates phishing attacks to help organizations assess employee awareness and response to security threats.

## 🚀 Features

- **Dual Database Support:** Use either SQLite or MySQL. MySQL is currently active (`modelsMySQL.js` and `initdbMySQL.js` are used in the backend code).
- **Separate Servers:**
  - `server.js`: Manages the platform backend.
  - `phishingServer.js`: Manages phishing link requests, with a separate base URL for realism.
- **JWT Authentication:** Access and refresh tokens with automatic expiration.
- **Bootstrap Frontend:** Responsive, modern UI components.
- **User Management:** Users of the platform are created by running `initdbMySQL.js`.

## 📂 Setup Instructions

1. **Clone the repository:**

```bash
git clone https://github.com/razvaniordan/Social-engineering-application.git
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:** Create `.env` files for both servers with token secrets and database credentials.

4. **Initialize the database:**

- **For MySQL:** Run:

```bash
node initdbMySQL.js
```

- **For SQLite:** Run:

```bash
node initdb.js
```

5. **Start the servers:**

- **Platform server:**

```bash
node server.js
```

- **Phishing server:**

```bash
node phishingServer.js
```

6. **Access the platform:** Open [http://localhost:3000](http://localhost:3000) and log in with credentials created via `initdbMySQL.js`.

7. **Run phishing campaigns:**

- Generate phishing links.
- Track clicks, email opens, and employee actions.

## 🛡️ Security Considerations

- Refresh tokens stored in the database.
- Access tokens expire for session safety.
- Phishing server runs separately to prevent easy tracking.

# Social Engineering Application

This platform simulates phishing attacks to help organizations assess employee awareness and response to security threats.

## 🚀 Features
- **Dual Database Support:** Use either SQLite or MySQL. MySQL is currently active (`modelsMySQL.js` and `initdbMySQL.js`).
- **Separate Servers:**
  - `server.js`: Manages the platform backend.
  - `phishingServer.js`: Manages phishing link requests, with a separate base URL for realism.
- **JWT Authentication:** Access and refresh tokens with automatic expiration.
- **Bootstrap Frontend:** Responsive, modern UI components.
- **User Management:** Users are created by running `initdbMySQL.js`.

## 📂 Setup Instructions

1. **Clone the repository:**
```bash
git clone https://github.com/razvaniordan/Social-engineering-application.git
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create `.env` files for both servers with token secrets and database credentials.

4. **Initialize the database:**
- **For MySQL:** Run:
```bash
node initdbMySQL.js
```
⚠️ **Important:** Don't forget to modify the modelsMySQL.js file with your corresponding MySQL database information.

- **For SQLite:** Run:
```bash
node initdb.js
```

5. **Install Ubuntu & Redis (for email sending service):**
- **Install Ubuntu on Windows (using WSL):**
   - Open PowerShell as Administrator and run:
   ```bash
   wsl --install
   ```
   - After installation, open Ubuntu and set it up.

- **Install Redis in Ubuntu:**
```bash
sudo apt update
sudo apt install redis-server
```
- **Start and enable Redis:**
```bash
sudo systemctl enable redis-server --now
```
- **Test Redis installation:**
```bash
redis-cli ping
```
If you see "PONG," Redis is running.

⚠️ **Important:** Keep Ubuntu open when sending emails, as Redis needs to run for email functionality.

6. **Start the servers:**
- **Platform server:**
```bash
node server.js
```
- **Phishing server:**
```bash
node phishingServer.js
```

7. **Access the platform:**
Open [http://localhost:3000](http://localhost:3000) and log in with credentials created via `initdbMySQL.js`.

8. **Run phishing campaigns:**
- Generate phishing links.
- Track clicks, email opens, and employee actions.

## 🛡️ Security Considerations
- Refresh tokens stored in the database.
- Access tokens expire for session safety.
- Phishing server runs separately to prevent easy tracking.

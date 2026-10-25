# Codomax BlogSpace — Module 4 CRUD

## Files
- `index.html`: application page structure
- `style.css`: responsive styling
- `script.js`: frontend API calls and UI behavior
- `backend/server.js`: Express/Mongoose API

## Setup
1. Keep your existing `backend/.env` file and make sure it contains `MONGODB_URI` and optionally `PORT=3000`.
2. From the `backend` folder, run `npm.cmd start` in PowerShell.
3. Open the root `index.html` with VS Code Live Server or visit `http://localhost:3000` if Express static serving is configured as in `server.js`.
4. Register a new account, log in, create a blog, then test Edit and Delete from the dashboard.

## API routes
- `POST /api/register`
- `POST /api/login`
- `GET /api/blogs?search=...&category=...`
- `GET /api/blogs/:id`
- `POST /api/blogs`
- `PUT /api/blogs/:id`
- `DELETE /api/blogs/:id`

## Important security note
This is an internship/demo implementation. The frontend's localStorage login state is not authentication, and the update/delete endpoints do not enforce ownership. Do not deploy publicly with real users or sensitive data until server-side authentication and authorization are added.

# Codomax Blog Application

## About the Project

A simple blog application backend developed as part of the Codomax internship, using Node.js and Express.js.

## Features

* User registration
* User login
* Create blog posts
* Retrieve all blog posts
* JSON-based API responses
* CORS support

## Technologies Used

* Node.js
* Express.js
* JavaScript
* HTML and CSS

## Project Structure

* `server.js` — Backend server and API routes
* `package.json` — Project configuration and dependencies
* `package-lock.json` — Dependency lock file
* `index.html` — Frontend page
* `style.css` — Frontend styling
* `script.js` — Frontend functionality

## How to Run

1. Install Node.js.

2. Download or clone this repository.

3. Open a terminal in the project folder.

4. Install dependencies:

   `npm install`

5. Start the server:

   `npm start`

6. Open `http://localhost:3000` in your browser.

The home route should return a message confirming that the Codomax Blog API is running.

## API Endpoints

| Method | Endpoint        | Purpose                 |
| ------ | --------------- | ----------------------- |
| GET    | `/`             | Check server status     |
| POST   | `/api/register` | Register a user         |
| POST   | `/api/login`    | Log in a user           |
| POST   | `/api/blogs`    | Create a blog post      |
| GET    | `/api/blogs`    | Retrieve all blog posts |

## Notes

This project currently uses temporary in-memory storage. User accounts and blog posts are reset when the server restarts. Password hashing and persistent database storage are not implemented yet.

## Author

Javeria Eiman

## Internship

Codomax Internship — Module 2


const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;
app.use(cors());
// Allow Express to read JSON request bodies
app.use(express.json());

// Temporary in-memory storage for development
const users = [];
const blogs = [];

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Codomax Blog API is running!"
  });
});

// User registration API
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email, and password are required."
    });
  }

  const existingUser = users.find(
    (user) => user.email === email.toLowerCase()
  );

  if (existingUser) {
    return res.status(409).json({
      message: "An account with this email already exists."
    });
  }

  const user = {
    id: users.length + 1,
    name,
    email: email.toLowerCase()
  };

  // Demo only: password storage will be secured
  // with password hashing in our next improvement.
  users.push({ ...user, password });

  res.status(201).json({
    message: "User registered successfully!",
    user
  });
});

// User login API
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  const user = users.find(
    (item) =>
      item.email === email.toLowerCase() &&
      item.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password."
    });
  }

  res.json({
    message: "Login successful!",
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
});

// Create blog API
app.post("/api/blogs", (req, res) => {
  const { title, content, author } = req.body;

  if (!title || !content || !author) {
    return res.status(400).json({
      message: "Title, content, and author are required."
    });
  }

  const blog = {
    id: blogs.length + 1,
    title,
    content,
    author,
    createdAt: new Date().toISOString()
  };

  blogs.push(blog);

  res.status(201).json({
    message: "Blog created successfully!",
    blog
  });
});

// Get all blogs
app.get("/api/blogs", (req, res) => {
  res.json(blogs);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
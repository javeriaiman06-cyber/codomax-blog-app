
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("../"));

const PORT = process.env.PORT || 3000;

// Database models
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema, "users");
const Blog = mongoose.model("Blog", blogSchema, "blogs");

// Home route
app.get("/api", (req, res) => {
  res.json({ message: "Codomax Blog API is running!" });
});

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Registration successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Could not register user." });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    res.json({
      message: "Login successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Could not log in." });
  }
});

// Get all blogs
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error("Fetch blogs error:", error.message);
    res.status(500).json({ message: "Could not fetch blogs." });
  }
});

// Get one blog by its ID
app.get("/api/blogs/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid blog ID." });
    }

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    res.json(blog);
  } catch (error) {
    console.error("Fetch blog error:", error.message);
    res.status(500).json({ message: "Could not fetch blog." });
  }
});

// Create a blog
app.post("/api/blogs", async (req, res) => {
  try {
    const { title, content, author, authorId } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({
        message: "Title, content and author are required."
      });
    }

    if (authorId && !mongoose.isValidObjectId(authorId)) {
      return res.status(400).json({ message: "Invalid author ID." });
    }

    if (authorId && !(await User.findById(authorId))) {
      return res.status(400).json({ message: "Author not found." });
    }

    const blog = await Blog.create({
      title: title.trim(),
      content,
      author: author.trim(),
      ...(authorId ? { authorId } : {})
    });

    res.status(201).json({
      message: "Blog created successfully!",
      blog
    });
  } catch (error) {
    console.error("Create blog error:", error.message);
    res.status(500).json({ message: "Could not create blog." });
  }
});

// Connect to MongoDB before starting the server
async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing from your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();

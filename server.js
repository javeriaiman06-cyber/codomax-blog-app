
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true }
}, { timestamps: true });

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  category: { type: String, default: "General" },
  author: { type: String, required: true },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Blog = mongoose.model("Blog", blogSchema);

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please log in again."
    });
  }
}

app.get("/api", (req, res) => {
  res.json({ message: "Codomax Blog API is running!" });
});

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters."
      });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({
        message: "Email already registered. Please log in."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Registration successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Registration failed."
    });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Login failed."
    });
  }
});

// PROTECTED USER PROFILE
app.get("/api/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId)
      .select("name email createdAt");

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: "Could not load profile."
    });
  }
});

// SHOW ONLY THE LOGGED-IN USER'S BLOGS
app.get("/api/blogs", authenticate, async (req, res) => {
  try {
    const blogs = await Blog.find({
      owner: req.auth.userId
    }).sort({ createdAt: -1 });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({
      message: "Could not load blogs."
    });
  }
});

// CREATE BLOG
app.post("/api/blogs", authenticate, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    const category = String(req.body.category || "General").trim();

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required."
      });
    }

    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(401).json({
        message: "Please log in again."
      });
    }

    const blog = await Blog.create({
      title,
      content,
      category: category || "General",
      author: user.name,
      owner: user._id
    });

    res.status(201).json({
      message: "Blog created successfully!",
      blog
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not create blog."
    });
  }
});

// UPDATE ONLY YOUR OWN BLOG
app.put("/api/blogs/:id", authenticate, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    const category = String(req.body.category || "General").trim();

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required."
      });
    }

    const blog = await Blog.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.auth.userId
      },
      {
        title,
        content,
        category: category || "General"
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found or access denied."
      });
    }

    res.json({
      message: "Blog updated successfully!",
      blog
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not update blog."
    });
  }
});

// DELETE ONLY YOUR OWN BLOG
app.delete("/api/blogs/:id", authenticate, async (req, res) => {
  try {
    const blog = await Blog.findOneAndDelete({
      _id: req.params.id,
      owner: req.auth.userId
    });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found or access denied."
      });
    }

    res.json({
      message: "Blog deleted successfully!"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not delete blog."
    });
  }
});

// FRONTEND
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "..", "index.html"));
});

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing from backend/.env");
  process.exit(1);
}

if (!process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 20) {
  console.error(
    "Add a JWT_SECRET of at least 20 characters to backend/.env"
  );
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

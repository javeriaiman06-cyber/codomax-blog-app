
const API_BASE = "http://localhost:3000/api";
const CURRENT_USER_KEY = "blogspace_current_user";
const TOKEN_KEY = "blogspace_token";

let blogs = [];
let currentUser = readCurrentUser();
let editingBlogId = null;

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
  } catch {
    return null;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function showMessage(id, text, error = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = text;
  element.className = error ? "message error" : "message";
}

// API REQUEST WITH JWT TOKEN
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
}

function updateUserUI() {
  document.getElementById("welcomeMessage").textContent = currentUser
    ? `Welcome, ${currentUser.name}! Manage your blog posts below.`
    : "Log in to manage your blogs.";

  document.getElementById("logoutButton").hidden = !currentUser;
}

// LOAD BLOGS
async function loadBlogs(search = "", category = "all") {
  const grid = document.getElementById("blogGrid");
  grid.innerHTML = "<p>Loading blogs...</p>";

  try {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (category && category !== "all") {
      params.set("category", category);
    }

    blogs = await apiRequest(
      `/blogs${params.toString() ? `?${params}` : ""}`
    );

    renderBlogs();
    renderDashboard();

    showMessage(
      "blogsMessage",
      blogs.length ? `${blogs.length} blog(s) found.` : "No blogs found yet."
    );
  } catch (error) {
    grid.innerHTML = "";
    showMessage(
      "blogsMessage",
      `${error.message}. Check that the backend is running.`,
      true
    );
  }
}

// DISPLAY BLOGS
function renderBlogs() {
  const grid = document.getElementById("blogGrid");

  if (!blogs.length) {
    grid.innerHTML = "<p>No blogs yet. Log in and create the first one!</p>";
    return;
  }

  grid.innerHTML = blogs.map((blog, index) => `
    <article class="blog-card">
      <div class="blog-image">${String(index + 1).padStart(2, "0")}</div>
      <div class="blog-content">
        <span class="category">${escapeHTML(blog.category || "General")}</span>
        <h3>${escapeHTML(blog.title)}</h3>
        <p>${escapeHTML((blog.content || "").slice(0, 150))}${(blog.content || "").length > 150 ? "…" : ""}</p>
        <p>By ${escapeHTML(blog.author || "Unknown")} · ${escapeHTML(formatDate(blog.createdAt))}</p>
        <a href="#blogs" class="read-more" data-read="${escapeHTML(blog._id)}">Read More →</a>
      </div>
    </article>
  `).join("");
}

// DASHBOARD
function renderDashboard() {
  document.getElementById("totalBlogs").textContent = blogs.length;

  const mine = currentUser
    ? blogs.filter(blog => blog.author === currentUser.name)
    : [];

  document.getElementById("myBlogs").textContent = mine.length;

  document.getElementById("categoriesCount").textContent =
    new Set(blogs.map(blog => blog.category || "General")).size;

  const body = document.getElementById("blogTableBody");

  if (!blogs.length) {
    body.innerHTML = '<tr><td colspan="5">No blogs to display.</td></tr>';
    return;
  }

  body.innerHTML = blogs.map(blog => `
    <tr>
      <td>${escapeHTML(blog.title)}</td>
      <td>${escapeHTML(blog.category || "General")}</td>
      <td>${escapeHTML(formatDate(blog.createdAt))}</td>
      <td>${escapeHTML(blog.author || "Unknown")}</td>
      <td>
        <button type="button" class="btn primary-btn" data-edit="${escapeHTML(blog._id)}">Edit</button>
        <button type="button" class="btn secondary-btn" data-delete="${escapeHTML(blog._id)}">Delete</button>
      </td>
    </tr>
  `).join("");
}

// REGISTER
document.getElementById("registerForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (password !== confirm) {
    return showMessage("registerMessage", "Passwords do not match.", true);
  }

  if (password.length < 8) {
    return showMessage("registerMessage", "Password must be at least 8 characters.", true);
  }

  try {
    const result = await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });

    currentUser = result.user;

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    localStorage.setItem(TOKEN_KEY, result.token);

    this.reset();
    updateUserUI();

    showMessage("registerMessage", result.message);

    await loadBlogs();
    location.hash = "dashboard";

  } catch (error) {
    showMessage("registerMessage", error.message, true);
  }
});

// LOGIN
document.getElementById("loginForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const result = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    currentUser = result.user;

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    localStorage.setItem(TOKEN_KEY, result.token);

    this.reset();
    updateUserUI();

    showMessage("loginMessage", result.message);

    await loadBlogs();
    location.hash = "dashboard";

  } catch (error) {
    showMessage("loginMessage", error.message, true);
  }
});

// LOGOUT
document.getElementById("logoutButton").addEventListener("click", () => {
  currentUser = null;

  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(TOKEN_KEY);

  updateUserUI();
  renderDashboard();

  location.hash = "home";
});

// RESET BLOG FORM
function resetBlogForm() {
  editingBlogId = null;

  document.getElementById("blogForm").reset();
  document.getElementById("formHeading").textContent = "Write a New Blog";
  document.getElementById("publishButton").textContent = "Publish Blog";
  document.getElementById("cancelEditButton").hidden = true;
}

document.getElementById("cancelEditButton").addEventListener("click", resetBlogForm);

// CREATE OR UPDATE BLOG
document.getElementById("blogForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  if (!currentUser || !localStorage.getItem(TOKEN_KEY)) {
    showMessage("blogMessage", "Please register or log in before publishing.", true);
    location.hash = "login";
    return;
  }

  const title = document.getElementById("blogTitle").value.trim();
  const category = document.getElementById("blogCategory").value;
  const content = document.getElementById("blogContent").value.trim();

  if (!title || !category || !content) {
    return showMessage("blogMessage", "Please complete every field.", true);
  }

  const payload = {
    title,
    category,
    content,
    author: currentUser.name
  };

  try {
    let result;

    if (editingBlogId) {
      result = await apiRequest(`/blogs/${editingBlogId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      result = await apiRequest("/blogs", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetBlogForm();

    showMessage("blogMessage", result.message);

    await loadBlogs();
    location.hash = "dashboard";

  } catch (error) {
    showMessage("blogMessage", error.message, true);
  }
});

// EDIT AND DELETE BLOGS
document.getElementById("blogTableBody").addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    if (!currentUser || !localStorage.getItem(TOKEN_KEY)) {
      return alert("Please log in first.");
    }

    const blog = blogs.find(item => item._id === editButton.dataset.edit);
    if (!blog) return;

    if (blog.author !== currentUser.name) {
      return alert("You can only edit blogs created under your name.");
    }

    editingBlogId = blog._id;

    document.getElementById("blogTitle").value = blog.title || "";
    document.getElementById("blogCategory").value = blog.category || "General";
    document.getElementById("blogContent").value = blog.content || "";

    document.getElementById("formHeading").textContent = "Edit Blog";
    document.getElementById("publishButton").textContent = "Save Changes";
    document.getElementById("cancelEditButton").hidden = false;

    showMessage("blogMessage", "Make your changes, then select Save Changes.");

    location.hash = "create-blog";
    return;
  }

  if (deleteButton) {
    if (!currentUser || !localStorage.getItem(TOKEN_KEY)) {
      return alert("Please log in first.");
    }

    const blog = blogs.find(item => item._id === deleteButton.dataset.delete);
    if (!blog) return;

    if (blog.author !== currentUser.name) {
      return alert("You can only delete blogs created under your name.");
    }

    if (!confirm(`Permanently delete "${blog.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await apiRequest(`/blogs/${blog._id}`, {
        method: "DELETE"
      });

      showMessage("dashboardMessage", result.message);

      await loadBlogs(
        document.getElementById("searchInput").value,
        document.getElementById("categoryFilter").value
      );

    } catch (error) {
      showMessage("dashboardMessage", error.message, true);
    }
  }
});

// READ BLOG
document.getElementById("blogGrid").addEventListener("click", event => {
  const link = event.target.closest("[data-read]");
  if (!link) return;

  event.preventDefault();

  const blog = blogs.find(item => item._id === link.dataset.read);

  if (blog) {
    alert(`${blog.title}\n\nCategory: ${blog.category || "General"}\nBy: ${blog.author}\n\n${blog.content}`);
  }
});

// SEARCH
document.getElementById("searchButton").addEventListener("click", () => {
  loadBlogs(
    document.getElementById("searchInput").value,
    document.getElementById("categoryFilter").value
  );
});

document.getElementById("clearSearchButton").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "all";
  loadBlogs();
});

document.getElementById("categoryFilter").addEventListener("change", () => {
  loadBlogs(
    document.getElementById("searchInput").value,
    document.getElementById("categoryFilter").value
  );
});

document.getElementById("searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();

    loadBlogs(
      document.getElementById("searchInput").value,
      document.getElementById("categoryFilter").value
    );
  }
});

// INITIALIZE
updateUserUI();
loadBlogs();


const API_URL = "http://localhost:3000/api";
const STORAGE_KEY = "inkspace_blogs_v1";
const SESSION_KEY = "inkspace_demo_session_v1";

const starterBlogs = [
  {
    id: "sample-1",
    title: "Small Habits, Big Changes",
    category: "Personal Growth",
    excerpt: "How tiny daily choices can help you build a more intentional life.",
    content: "Big changes do not always begin with big decisions. Often, progress comes from small actions repeated consistently. Start with one habit that feels manageable, make room for it in your day, and celebrate your progress.",
    author: "InkSpace Team",
    date: "2026-09-10",
    sample: true
  },
  {
    id: "sample-2",
    title: "Technology That Brings Us Closer",
    category: "Technology",
    excerpt: "Exploring how thoughtful technology can help people connect.",
    content: "Technology is most useful when it helps people solve real problems. Digital tools can make creativity and collaboration more accessible.",
    author: "InkSpace Team",
    date: "2026-09-12",
    sample: true
  },
  {
    id: "sample-3",
    title: "The Art of Slow Travel",
    category: "Travel",
    excerpt: "Discover more by slowing down and noticing the details.",
    content: "Travel is not only about how many places you visit. It is also about the details you notice, the conversations you have, and the new things you experience.",
    author: "InkSpace Team",
    date: "2026-09-15",
    sample: true
  }
];

let blogs = [
  ...starterBlogs,
  ...readStored(STORAGE_KEY, []).filter(blog => !blog.sample)
];

let currentUser = readStored(SESSION_KEY, null);
let editingId = null;
let toastTimer;

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveBlogs() {
  const localBlogs = blogs.filter(
    blog => !blog.sample && !blog.server
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(localBlogs));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => toast.classList.remove("show"),
    2800
  );
}

// Load blogs from the Express backend
async function loadServerBlogs() {
  try {
    const response = await fetch(`${API_URL}/blogs`);

    if (!response.ok) {
      throw new Error("Could not load blogs.");
    }

    const serverBlogs = await response.json();

    const formattedBlogs = serverBlogs.map(blog => ({
      ...blog,
      id: String(blog.id),
      category: blog.category || "Personal Growth",
      excerpt: blog.excerpt ||
        String(blog.content || "").slice(0, 120),
      date: blog.date ||
        (blog.createdAt
          ? blog.createdAt.slice(0, 10)
          : ""),
      owner:
        currentUser &&
        currentUser.name === blog.author
          ? currentUser.email
          : null,
      server: true
    }));

    // Keep sample and older local posts, replacing API posts
    blogs = blogs.filter(blog => !blog.server);
    blogs.push(...formattedBlogs);

    renderHome();
    renderDashboard();
  } catch (error) {
    showToast(
      "Could not load server blogs. Check that your backend is running."
    );
  }
}

function navigate(page) {
  const target = document.getElementById(page)
    ? page
    : "home";

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle(
      "hidden",
      section.id !== target
    );
  });

  document.querySelectorAll("[data-page]").forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.page === target
    );
  });

  if (target === "dashboard") renderDashboard();
  if (target === "home") renderHome();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", event => {
  const link = event.target.closest("[data-page]");
  if (!link) return;

  event.preventDefault();
  const page = link.dataset.page;

  if (
    (page === "create" || page === "dashboard") &&
    !currentUser
  ) {
    showToast("Please log in first.");
    navigate("login");
    return;
  }

  navigate(page);
});

function updateAuthUI() {
  const loggedIn = Boolean(currentUser);

  document.getElementById("loginLink")
    .classList.toggle("hidden", loggedIn);

  document.getElementById("registerLink")
    .classList.toggle("hidden", loggedIn);

  document.getElementById("logoutBtn")
    .classList.toggle("hidden", !loggedIn);
}

function blogCard(blog, dashboard = false) {
  const icons = {
    Technology: "💻",
    Lifestyle: "🌿",
    Travel: "✈️",
    Education: "📚",
    Creativity: "🎨",
    "Personal Growth": "✨"
  };

  const icon = icons[blog.category] || "✍️";

  const artNumber =
    (Math.abs(
      String(blog.id)
        .split("")
        .reduce((sum, character) =>
          sum + character.charCodeAt(0), 0)
    ) % 5) + 1;

  // Server-created blogs do not have edit/delete APIs yet
  const actions =
    dashboard &&
    !blog.sample &&
    !blog.server &&
    blog.owner === currentUser?.email
      ? `
        <div class="card-actions">
          <button class="btn btn-light small-btn"
            data-edit="${escapeHTML(blog.id)}">Edit</button>
          <button class="btn small-btn delete-btn"
            data-delete="${escapeHTML(blog.id)}">Delete</button>
        </div>`
      : "";

  return `
    <article class="blog-card">
      <div class="card-art art-${artNumber}" aria-hidden="true">
        ${icon}
      </div>
      <div class="card-body">
        <span class="category">
          ${escapeHTML(blog.category)}
        </span>
        <h3>${escapeHTML(blog.title)}</h3>
        <p>${escapeHTML(blog.excerpt)}</p>
        <div class="card-meta">
          <span>By ${escapeHTML(blog.author || "InkSpace Writer")}</span>
          <span>${escapeHTML(blog.date || "")}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-light small-btn"
            data-read="${escapeHTML(blog.id)}">
            Read story →
          </button>
        </div>
        ${actions}
      </div>
    </article>`;
}

function renderHome() {
  const searchElement = document.getElementById("searchInput");
  const search = searchElement.value.trim().toLowerCase();

  const filtered = blogs.filter(blog =>
    [
      blog.title,
      blog.category,
      blog.excerpt,
      blog.content,
      blog.author
    ].some(value =>
      String(value || "").toLowerCase().includes(search)
    )
  );

  document.getElementById("blogGrid").innerHTML =
    filtered.map(blog => blogCard(blog)).join("");

  document.getElementById("emptyMessage")
    .classList.toggle("hidden", filtered.length > 0);
}

function renderDashboard() {
  const mine = currentUser
    ? blogs.filter(blog =>
        !blog.sample &&
        blog.owner === currentUser.email
      )
    : [];

  document.getElementById("totalPosts").textContent =
    mine.length;

  document.getElementById("publishedPosts").textContent =
    mine.length;

  document.getElementById("dashboardGrid").innerHTML =
    mine.map(blog => blogCard(blog, true)).join("");

  document.getElementById("dashboardEmpty")
    .classList.toggle("hidden", mine.length > 0);
}

function openArticle(id) {
  const blog = blogs.find(item => String(item.id) === String(id));
  if (!blog) return;

  document.getElementById("articleContent").innerHTML = `
    <span class="category">${escapeHTML(blog.category)}</span>
    <h1>${escapeHTML(blog.title)}</h1>
    <p class="card-meta">
      By ${escapeHTML(blog.author || "InkSpace Writer")}
      · ${escapeHTML(blog.date || "")}
    </p>
    <p><strong>${escapeHTML(blog.excerpt)}</strong></p>
    <div class="article-text">${escapeHTML(blog.content)}</div>
  `;

  navigate("article");
}

document.addEventListener("click", event => {
  const readButton = event.target.closest("[data-read]");
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (readButton) openArticle(readButton.dataset.read);

  if (editButton) {
    const blog = blogs.find(
      item => String(item.id) === editButton.dataset.edit
    );

    if (
      !blog ||
      blog.server ||
      !currentUser ||
      blog.owner !== currentUser.email
    ) return;

    editingId = blog.id;
    document.getElementById("blogTitle").value = blog.title;
    document.getElementById("blogCategory").value = blog.category;
    document.getElementById("blogExcerpt").value = blog.excerpt;
    document.getElementById("blogContent").value = blog.content;
    document.getElementById("editorHeading").textContent =
      "Edit Your Blog";
    document.getElementById("publishBtn").textContent =
      "Save Changes";

    navigate("create");
  }

  if (deleteButton) {
    const blog = blogs.find(
      item => String(item.id) === deleteButton.dataset.delete
    );

    if (
      !blog ||
      blog.server ||
      !currentUser ||
      blog.owner !== currentUser.email
    ) return;

    if (confirm("Delete this blog post? This cannot be undone.")) {
      blogs = blogs.filter(item => item.id !== blog.id);
      saveBlogs();
      renderDashboard();
      renderHome();
      showToast("Blog deleted.");
    }
  }
});

document.getElementById("searchInput")
  .addEventListener("input", renderHome);

// USER REGISTRATION API
document.getElementById("registerForm")
  .addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("registerName")
      .value.trim();

    const email = document.getElementById("registerEmail")
      .value.trim().toLowerCase();

    const password = document.getElementById("registerPassword")
      .value;

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || "Registration failed.");
        return;
      }

      currentUser = data.user;
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(currentUser)
      );

      event.target.reset();
      updateAuthUI();
      showToast("Account created! Welcome to InkSpace.");
      navigate("dashboard");
    } catch (error) {
      showToast(
        "Cannot connect to the backend. Check that the server is running."
      );
    }
  });

// USER LOGIN API
document.getElementById("loginForm")
  .addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("loginEmail")
      .value.trim().toLowerCase();

    const password = document.getElementById("loginPassword")
      .value;

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || "Login failed.");
        return;
      }

      currentUser = data.user;
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(currentUser)
      );

      event.target.reset();
      updateAuthUI();
      showToast("Welcome back, " + currentUser.name + "!");
      await loadServerBlogs();
      navigate("dashboard");
    } catch (error) {
      showToast(
        "Cannot connect to the backend. Check that the server is running."
      );
    }
  });

// LOGOUT
document.getElementById("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
  updateAuthUI();
  showToast("You have logged out.");
  navigate("home");
});

// CREATE BLOG API
document.getElementById("blogForm")
  .addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) {
      showToast("Please log in first.");
      navigate("login");
      return;
    }

    const title = document.getElementById("blogTitle")
      .value.trim();

    const category = document.getElementById("blogCategory").value;

    const excerpt = document.getElementById("blogExcerpt")
      .value.trim();

    const content = document.getElementById("blogContent")
      .value.trim();

    if (!title || !excerpt || !content) {
      showToast("Please complete all required fields.");
      return;
    }

    // Editing older browser-only posts remains local for now
    if (editingId) {
      const index = blogs.findIndex(blog =>
        String(blog.id) === String(editingId) &&
        !blog.server &&
        blog.owner === currentUser.email
      );

      if (index !== -1) {
        blogs[index] = {
          ...blogs[index],
          title,
          category,
          excerpt,
          content
        };
      }

      saveBlogs();
      showToast("Your local blog has been updated.");
      resetEditor();
      renderHome();
      navigate("dashboard");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/blogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          author: currentUser.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || "Could not publish blog.");
        return;
      }

      const savedBlog = {
        ...data.blog,
        id: String(data.blog.id),
        title,
        category,
        excerpt,
        content,
        author: currentUser.name,
        owner: currentUser.email,
        date: data.blog.createdAt
          ? data.blog.createdAt.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        server: true
      };

      blogs = blogs.filter(blog =>
        String(blog.id) !== String(savedBlog.id)
      );
      blogs.push(savedBlog);

      resetEditor();
      renderHome();
      renderDashboard();
      showToast("Your blog has been published to the backend!");
      navigate("dashboard");
    } catch (error) {
      showToast(
        "Cannot connect to the backend. Check that the server is running."
      );
    }
  });

function resetEditor() {
  editingId = null;
  document.getElementById("blogForm").reset();
  document.getElementById("editorHeading").textContent =
    "Create a Blog";
  document.getElementById("publishBtn").textContent =
    "Publish Blog";
}

document.getElementById("cancelEdit").addEventListener("click", () => {
  resetEditor();
  navigate(currentUser ? "dashboard" : "home");
});

document.getElementById("year").textContent =
  new Date().getFullYear();

updateAuthUI();
renderHome();
navigate("home");
loadServerBlogs();
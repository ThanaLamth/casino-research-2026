const createForm = document.querySelector("#create-form");
const articleTitleInput = document.querySelector("#article-title");
const templateSelect = document.querySelector("#template-select");
const globalStatus = document.querySelector("#global-status");
const templateDescription = document.querySelector("#template-description");
const templateSummary = document.querySelector("#template-summary");
const draftPreview = document.querySelector("#draft-preview");
const refreshBtn = document.querySelector("#refresh-btn");
const articleList = document.querySelector("#article-list");
const queueSummary = document.querySelector("#queue-summary");
const detailTitle = document.querySelector("#detail-title");
const detailSubhead = document.querySelector("#detail-subhead");
const articleSummary = document.querySelector("#article-summary");
const researchList = document.querySelector("#research-list");
const outlineList = document.querySelector("#outline-list");
const requiredCount = document.querySelector("#required-count");
const slotForm = document.querySelector("#slot-form");
const finalizeBtn = document.querySelector("#finalize-btn");
const statusEl = document.querySelector("#status");
const draftOutput = document.querySelector("#draft-output");
const generatedOutput = document.querySelector("#generated-output");
const downloadLink = document.querySelector("#download-link");
const emptyState = document.querySelector("#empty-state");
const detailView = document.querySelector("#detail-view");

const state = {
  templates: [],
  currentTemplate: null,
  articles: [],
  selectedArticleId: "",
  selectedArticle: null,
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || `Request failed: ${response.status}`);
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status) {
  const map = {
    draft_ready: "Draft Ready",
    images_in_progress: "Images In Progress",
    ready_to_finalize: "Ready To Finalize",
    publish_ready: "Publish Ready",
  };
  return map[status] || status;
}

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTemplateSummary(template) {
  templateSummary.innerHTML = "";
  const items = [
    ["Output file", template.outputFileName],
    ["Required slots", String(template.slots.filter((slot) => slot.required).length)],
    ["Optional slots", String(template.slots.filter((slot) => !slot.required).length)],
  ];

  items.forEach(([label, value]) => {
    const node = document.createElement("div");
    node.className = "summary-item";
    node.innerHTML = `<strong>${escapeHtml(label)}</strong><div>${escapeHtml(value)}</div>`;
    templateSummary.appendChild(node);
  });
}

function renderTemplate(template) {
  state.currentTemplate = template;
  templateDescription.textContent = template.description;
  draftPreview.textContent = template.draft;
  renderTemplateSummary(template);
}

function renderQueueSummary() {
  queueSummary.innerHTML = "";
  const counts = {
    total: state.articles.length,
    draft_ready: state.articles.filter((article) => article.status === "draft_ready").length,
    images_in_progress: state.articles.filter((article) => article.status === "images_in_progress").length,
    ready_to_finalize: state.articles.filter((article) => article.status === "ready_to_finalize").length,
    publish_ready: state.articles.filter((article) => article.status === "publish_ready").length,
  };

  [
    ["Total articles", String(counts.total)],
    ["Draft ready", String(counts.draft_ready)],
    ["Images in progress", String(counts.images_in_progress)],
    ["Ready to finalize", String(counts.ready_to_finalize)],
    ["Publish ready", String(counts.publish_ready)],
  ].forEach(([label, value]) => {
    const node = document.createElement("div");
    node.className = "summary-item";
    node.innerHTML = `<strong>${escapeHtml(label)}</strong><div>${escapeHtml(value)}</div>`;
    queueSummary.appendChild(node);
  });
}

function renderArticleList() {
  if (!state.articles.length) {
    articleList.innerHTML = `<div class="empty-state compact-empty">No drafts in queue yet.</div>`;
    renderQueueSummary();
    return;
  }

  articleList.innerHTML = state.articles
    .map((article) => {
      const active = article.id === state.selectedArticleId ? "active" : "";
      return `
        <button class="article-card ${active}" type="button" data-article-id="${escapeHtml(article.id)}">
          <div class="article-card-top">
            <h3>${escapeHtml(article.title)}</h3>
            <span class="status-pill status-${escapeHtml(article.status)}">${escapeHtml(statusLabel(article.status))}</span>
          </div>
          <p class="muted compact">${escapeHtml(article.slug)}</p>
          <div class="article-progress">
            <span>${escapeHtml(String(article.requiredFilledSlots))}/${escapeHtml(String(article.requiredSlots))} required slots filled</span>
            <span>${escapeHtml(String(article.filledSlots))} total uploads</span>
          </div>
          <p class="muted compact">Updated ${escapeHtml(formatDate(article.updatedAt))}</p>
        </button>
      `;
    })
    .join("");

  renderQueueSummary();

  articleList.querySelectorAll("[data-article-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectArticle(button.getAttribute("data-article-id"));
    });
  });
}

function buildSummaryCards(article) {
  articleSummary.innerHTML = "";
  const filledRequired = article.slots.filter((slot) => slot.required && slot.uploadedFile).length;
  const requiredSlots = article.slots.filter((slot) => slot.required).length;
  const items = [
    ["Status", statusLabel(article.status)],
    ["Template", article.templateId],
    ["Required slots", `${filledRequired}/${requiredSlots}`],
    ["Updated", formatDate(article.updatedAt)],
  ];

  items.forEach(([label, value]) => {
    const node = document.createElement("div");
    node.className = "summary-item";
    node.innerHTML = `<strong>${escapeHtml(label)}</strong><div>${escapeHtml(value)}</div>`;
    articleSummary.appendChild(node);
  });
}

function renderList(container, items, emptyText) {
  container.innerHTML = "";
  if (!items.length) {
    const item = document.createElement("li");
    item.textContent = emptyText;
    container.appendChild(item);
    return;
  }
  items.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    container.appendChild(item);
  });
}

function slotStatusText(slot) {
  if (slot.uploadedFile) {
    return slot.required ? "Required uploaded" : "Optional uploaded";
  }
  return slot.required ? "Required pending" : "Optional pending";
}

function renderSlotCard(slot) {
  const preview = slot.previewUrl
    ? `<div class="slot-preview"><img src="${escapeHtml(slot.previewUrl)}" alt="${escapeHtml(slot.alt || slot.label)}" /></div>`
    : `<div class="slot-preview placeholder">No image uploaded yet</div>`;

  return `
    <article class="slot-card ${slot.required ? "required" : ""}" data-slot-id="${escapeHtml(slot.id)}">
      <div class="slot-top">
        <div>
          <h3 class="slot-title">${escapeHtml(slot.label)}</h3>
          <p class="muted compact">${escapeHtml(slot.section)}</p>
        </div>
        <span class="status-pill ${slot.uploadedFile ? "status-publish_ready" : "status-draft_ready"}">${escapeHtml(slotStatusText(slot))}</span>
      </div>
      <p class="slot-meta">
        <strong>Why it matters:</strong> ${escapeHtml(slot.whyItMatters)}<br />
        <strong>Capture note:</strong> ${escapeHtml(slot.captureNote)}<br />
        <strong>SEO filename:</strong> ${escapeHtml(slot.seoFileBase || slot.id)}
      </p>
      ${preview}
      <div class="slot-actions">
        <label class="field-label grow">
          Image file
          <input type="file" data-file-for="${escapeHtml(slot.id)}" accept="image/*" />
        </label>
        <button class="secondary upload-btn" type="button" data-upload-slot="${escapeHtml(slot.id)}">Upload</button>
      </div>
      <details class="slot-advanced">
        <summary>Advanced edit: alt text and caption</summary>
        <div class="slot-fields">
          <label class="field-label">
            Alt text
            <input type="text" data-alt-for="${escapeHtml(slot.id)}" value="${escapeHtml(slot.alt || "")}" placeholder="Describe what the image actually shows" />
          </label>
          <label class="field-label">
            Caption
            <input type="text" data-caption-for="${escapeHtml(slot.id)}" value="${escapeHtml(slot.caption || "")}" placeholder="Explain why this image matters in the review" />
          </label>
        </div>
      </details>
    </article>
  `;
}

function renderSelectedArticle(article) {
  state.selectedArticle = article;
  state.selectedArticleId = article.id;
  emptyState.classList.add("hidden");
  detailView.classList.remove("hidden");

  detailTitle.textContent = article.title;
  detailSubhead.textContent = `${statusLabel(article.status)} • ${article.slug}`;
  requiredCount.textContent = `${article.slots.filter((slot) => slot.required).length} required image slots`;
  draftOutput.value = article.draftMarkdown || "";
  generatedOutput.value = article.publishReadyMarkdown || "";

  if (article.publishReadyPath) {
    downloadLink.href = article.publishReadyPath;
    downloadLink.classList.remove("hidden");
  } else {
    downloadLink.classList.add("hidden");
  }

  buildSummaryCards(article);
  renderList(researchList, article.researchSummary || [], "No research summary yet.");
  renderList(
    outlineList,
    (article.outline || []).map((item) => `${item.section}: ${item.label}`),
    "No outline yet.",
  );
  slotForm.innerHTML = article.slots.map(renderSlotCard).join("");
  statusEl.textContent = "";

  slotForm.querySelectorAll("[data-upload-slot]").forEach((button) => {
    button.addEventListener("click", async () => {
      const slotId = button.getAttribute("data-upload-slot");
      await uploadSlot(slotId, button);
    });
  });

  renderArticleList();
}

async function loadTemplates() {
  const data = await fetchJson("/api/templates");
  state.templates = data.templates;
  templateSelect.innerHTML = data.templates
    .map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.title)}</option>`)
    .join("");

  if (data.templates[0]) {
    const template = await fetchJson(`/api/templates/${data.templates[0].id}`);
    renderTemplate(template);
  }
}

async function loadArticles() {
  const data = await fetchJson("/api/articles");
  state.articles = data.articles;
  renderArticleList();

  if (state.selectedArticleId) {
    const exists = state.articles.find((article) => article.id === state.selectedArticleId);
    if (exists) {
      await selectArticle(state.selectedArticleId);
      return;
    }
  }

  if (!state.selectedArticleId && state.articles[0]) {
    await selectArticle(state.articles[0].id);
  }
}

async function selectArticle(articleId) {
  const data = await fetchJson(`/api/articles/${articleId}`);
  renderSelectedArticle(data.article);
}

async function createArticle(event) {
  event.preventDefault();
  const title = articleTitleInput.value.trim();
  const templateId = templateSelect.value;

  if (!title || !templateId) {
    globalStatus.textContent = "Title and template are required.";
    return;
  }

  const submitButton = createForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  globalStatus.textContent = "Generating draft...";

  try {
    const payload = await fetchJson("/api/articles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, templateId }),
    });

    articleTitleInput.value = "";
    await loadArticles();
    await selectArticle(payload.article.id);
    globalStatus.textContent = "Draft generated and added to the queue.";
  } catch (error) {
    globalStatus.textContent = String(error.message || error);
  } finally {
    submitButton.disabled = false;
  }
}

async function uploadSlot(slotId, button) {
  if (!state.selectedArticle) return;
  const fileInput = slotForm.querySelector(`[data-file-for="${slotId}"]`);
  const file = fileInput?.files?.[0];
  if (!file) {
    statusEl.textContent = "Choose an image before uploading.";
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  button.disabled = true;
  statusEl.textContent = `Uploading image for ${slotId}...`;

  try {
    const response = await fetch(
      `/api/articles/${state.selectedArticle.id}/slots/${slotId}`,
      {
        method: "POST",
        body: formData,
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || payload.detail || "Upload failed");
    }
    renderSelectedArticle(payload.article);
    await loadArticles();
    statusEl.textContent = `Uploaded image for ${slotId}.`;
  } catch (error) {
    statusEl.textContent = String(error.message || error);
  } finally {
    button.disabled = false;
  }
}

function collectSlotMeta() {
  const metadata = {};
  if (!state.selectedArticle) return metadata;
  state.selectedArticle.slots.forEach((slot) => {
    const altInput = slotForm.querySelector(`[data-alt-for="${slot.id}"]`);
    const captionInput = slotForm.querySelector(`[data-caption-for="${slot.id}"]`);
    metadata[slot.id] = {
      alt: altInput?.value?.trim() || slot.alt || "",
      caption: captionInput?.value?.trim() || slot.caption || "",
    };
  });
  return metadata;
}

async function finalizeArticle() {
  if (!state.selectedArticle) return;
  finalizeBtn.disabled = true;
  statusEl.textContent = "Finalizing publish-ready draft...";

  try {
    const payload = await fetchJson(`/api/articles/${state.selectedArticle.id}/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slotMeta: collectSlotMeta() }),
    });
    renderSelectedArticle(payload.article);
    await loadArticles();
    generatedOutput.value = payload.article.publishReadyMarkdown || "";
    statusEl.textContent = "Publish-ready markdown generated.";
  } catch (error) {
    statusEl.textContent = String(error.message || error);
  } finally {
    finalizeBtn.disabled = false;
  }
}

templateSelect.addEventListener("change", async (event) => {
  const templateId = event.target.value;
  if (!templateId) return;
  try {
    const template = await fetchJson(`/api/templates/${templateId}`);
    renderTemplate(template);
  } catch (error) {
    globalStatus.textContent = String(error.message || error);
  }
});

createForm.addEventListener("submit", createArticle);
refreshBtn.addEventListener("click", async () => {
  try {
    globalStatus.textContent = "Refreshing queue...";
    await loadArticles();
    globalStatus.textContent = "Queue refreshed.";
  } catch (error) {
    globalStatus.textContent = String(error.message || error);
  }
});
finalizeBtn.addEventListener("click", finalizeArticle);

Promise.all([loadTemplates(), loadArticles()]).catch((error) => {
  globalStatus.textContent = String(error.message || error);
});

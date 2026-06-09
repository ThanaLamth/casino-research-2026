import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const publicDir = path.join(__dirname, "public");
const templatesDir = path.join(__dirname, "data", "templates");
const articlesDir = path.join(__dirname, "data", "articles");
const generatedDir = path.join(__dirname, "generated");
const generatedArticlesDir = path.join(generatedDir, "articles");
const articleLocks = new Map();

app.use(express.json({ limit: "10mb" }));
app.use("/generated", express.static(generatedDir));
app.use(express.static(publicDir));

function safeSlug(value) {
  return String(value || "output")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function replaceTokens(input, values) {
  return input.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, key) => values[key] ?? "");
}

function buildImageBlock(relativeImagePath, alt, caption) {
  return `![${alt}](${relativeImagePath})\n\nCaption: ${caption}`;
}

function nowIso() {
  return new Date().toISOString();
}

function buildArticleVariables(title, templateConfig) {
  const cleanTitle = title.trim();
  const slug = safeSlug(cleanTitle);
  const metaTitle = cleanTitle;
  const metaDescription = `Compare ${cleanTitle} using a structured editorial workflow with review evidence, bonuses, payout guidance, rewards analysis, and responsible gambling notes.`;
  const excerpt = `This draft covers ${cleanTitle} using a structured research, outline, drafting, and image-evidence workflow designed for casino review production.`;
  const disclaimer =
    "This draft is an editorial working file. It should be finalized only after the required high-value images, captions, and compliance notes are added. Gambling laws vary by market, and readers should only play where legal and age-appropriate. If the article references operator claims, editors should verify them against official operator pages before publication.";
  const tags = [
    cleanTitle,
    "casino reviews",
    "online casinos",
    "publish ready draft",
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");

  return {
    article_title: cleanTitle,
    meta_title: metaTitle,
    meta_description: metaDescription,
    excerpt,
    disclaimer,
    slug,
    primary_category: templateConfig.primaryCategory || "Online Casinos",
    secondary_category: templateConfig.secondaryCategory || "Casino Reviews",
    suggested_tags: tags,
    reviewer_name: templateConfig.reviewerName || "Editorial Team",
    workflow_summary: "Title -> Generate Draft -> Queue -> Fill Images -> Finalize",
    evidence_policy:
      "Use only high-value review evidence such as onboarding friction, cashier/payment proof, support replies, licensing, responsible gambling tools, or real-device captures. Avoid generic public-page screenshots unless they support a specific claim.",
    lead_summary: `This draft for ${cleanTitle} is designed to move from title-driven planning into a queue-based editorial workflow. Generate the draft first, then complete the image queue with high-value evidence before finalizing the publish-ready version.`,
    last_updated: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

async function ensureDirs() {
  await fs.mkdir(templatesDir, { recursive: true });
  await fs.mkdir(articlesDir, { recursive: true });
  await fs.mkdir(generatedArticlesDir, { recursive: true });
}

async function loadTemplate(templateId) {
  const jsonPath = path.join(templatesDir, `${templateId}.json`);
  const templateConfig = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  const markdownPath = path.join(templatesDir, templateConfig.templateFile);
  const markdown = await fs.readFile(markdownPath, "utf8");
  return { templateConfig, markdown };
}

async function saveArticle(article) {
  const filePath = path.join(articlesDir, `${article.id}.json`);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(article, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function loadArticle(articleId) {
  const raw = await fs.readFile(path.join(articlesDir, `${articleId}.json`), "utf8");
  return JSON.parse(raw);
}

async function listArticles() {
  const files = await fs.readdir(articlesDir);
  const items = [];
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    try {
      const article = JSON.parse(await fs.readFile(path.join(articlesDir, file), "utf8"));
      article.status = deriveStatus(article);
      items.push(article);
    } catch (error) {
      console.warn(`Skipping invalid article file ${file}: ${String(error)}`);
    }
  }
  return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function summarizeArticle(article) {
  const required = article.slots.filter((slot) => slot.required).length;
  const filled = article.slots.filter((slot) => slot.uploadedFile).length;
  const requiredFilled = article.slots.filter(
    (slot) => slot.required && slot.uploadedFile,
  ).length;
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    status: article.status,
    templateId: article.templateId,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    requiredSlots: required,
    filledSlots: filled,
    requiredFilledSlots: requiredFilled,
    publishReadyPath: article.publishReadyPath || "",
  };
}

function deriveStatus(article) {
  if (article.publishReadyMarkdown) return "publish_ready";
  const filledRequired = article.slots.every(
    (slot) => !slot.required || Boolean(slot.uploadedFile),
  );
  const anyFilled = article.slots.some((slot) => Boolean(slot.uploadedFile));
  if (filledRequired) return "ready_to_finalize";
  if (anyFilled) return "images_in_progress";
  return "draft_ready";
}

function buildSeoFilename(article, slot, file) {
  const ext = (path.extname(file.originalname || "") || ".png").toLowerCase();
  const slotBase = safeSlug(slot.seoFileBase || `${article.slug}-${slot.id}`);
  return `${slotBase}${ext}`;
}

function buildDraftFromTemplate(title, templateConfig, markdown) {
  const values = buildArticleVariables(title, templateConfig);
  return {
    variables: values,
    markdown: replaceTokens(markdown, values),
  };
}

async function withArticleLock(articleId, work) {
  const previous = articleLocks.get(articleId) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  articleLocks.set(articleId, previous.then(() => current));
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (articleLocks.get(articleId) === current) {
      articleLocks.delete(articleId);
    }
  }
}

app.get("/healthz", async (_req, res) => {
  try {
    await ensureDirs();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get("/api/templates", async (_req, res) => {
  try {
    const files = await fs.readdir(templatesDir);
    const templateIds = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""));
    const items = [];
    for (const id of templateIds) {
      const { templateConfig } = await loadTemplate(id);
      items.push({
        id,
        title: templateConfig.title,
        description: templateConfig.description,
        outputFileName: templateConfig.outputFileName,
        slots: templateConfig.slots,
      });
    }
    res.json({ templates: items });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/templates/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    const { templateConfig, markdown } = await loadTemplate(templateId);
    res.json({ ...templateConfig, draft: markdown });
  } catch (error) {
    res.status(404).json({ error: "Template not found", detail: String(error) });
  }
});

app.get("/api/articles", async (_req, res) => {
  try {
    const articles = await listArticles();
    res.json({ articles: articles.map(summarizeArticle) });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/articles", async (req, res) => {
  try {
    const { title, templateId } = req.body || {};
    if (!title || !templateId) {
      return res.status(400).json({ error: "title and templateId are required" });
    }

    const { templateConfig, markdown } = await loadTemplate(templateId);
    const { variables, markdown: draftMarkdown } = buildDraftFromTemplate(
      title,
      templateConfig,
      markdown,
    );

    const articleId = `${Date.now()}-${safeSlug(title).slice(0, 32)}`;
    const article = {
      id: articleId,
      title: title.trim(),
      slug: variables.slug,
      templateId,
      status: "draft_ready",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      meta: variables,
      researchSummary: [
        `Query target: ${title.trim()}`,
        "Intent: commercial investigation",
        `Scope: ${templateConfig.description}`,
        "Workflow: title -> generate draft -> queue -> fill images -> finalize",
        `Required image slots: ${templateConfig.slots.filter((slot) => slot.required).length}`,
        "Evidence standard: high-value images only",
      ],
      outline: templateConfig.slots.map((slot) => ({
        section: slot.section,
        slotId: slot.id,
        label: slot.label,
      })),
      draftMarkdown,
      publishReadyMarkdown: "",
      publishReadyPath: "",
      outputFileName: `${variables.slug}.publish-ready.md`,
      slots: templateConfig.slots.map((slot) => ({
        ...slot,
        alt: slot.defaultAlt || "",
        caption: slot.defaultCaption || "",
        uploadedFile: "",
        previewUrl: "",
        uploadedAt: "",
      })),
    };

    await saveArticle(article);
    res.status(201).json({ article: summarizeArticle(article) });
  } catch (error) {
    res.status(500).json({ error: "Article creation failed", detail: String(error) });
  }
});

app.get("/api/articles/:articleId", async (req, res) => {
  try {
    const article = await loadArticle(req.params.articleId);
    article.status = deriveStatus(article);
    res.json({ article });
  } catch (error) {
    res.status(404).json({ error: "Article not found", detail: String(error) });
  }
});

app.post("/api/articles/:articleId/slots/:slotId", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    const article = await withArticleLock(req.params.articleId, async () => {
      const currentArticle = await loadArticle(req.params.articleId);
      const slot = currentArticle.slots.find((item) => item.id === req.params.slotId);
      if (!slot) {
        const error = new Error("Slot not found");
        error.statusCode = 404;
        throw error;
      }

      const assetsDir = path.join(generatedArticlesDir, currentArticle.id, "assets");
      await fs.mkdir(assetsDir, { recursive: true });
      const filename = buildSeoFilename(currentArticle, slot, req.file);
      const filePath = path.join(assetsDir, filename);
      await fs.writeFile(filePath, req.file.buffer);

      slot.uploadedFile = `assets/${filename}`;
      slot.previewUrl = `/generated/articles/${currentArticle.id}/assets/${filename}`;
      slot.uploadedAt = nowIso();
      currentArticle.updatedAt = nowIso();
      currentArticle.status = deriveStatus(currentArticle);

      await saveArticle(currentArticle);
      return currentArticle;
    });
    res.json({ article });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.statusCode ? error.message : "Upload failed", detail: String(error) });
  }
});

app.post("/api/articles/:articleId/finalize", async (req, res) => {
  try {
    const article = await withArticleLock(req.params.articleId, async () => {
      const currentArticle = await loadArticle(req.params.articleId);
      const overrides = req.body?.slotMeta || {};

      for (const slot of currentArticle.slots) {
        const override = overrides[slot.id];
        if (override) {
          slot.alt = String(override.alt || slot.alt || "").trim();
          slot.caption = String(override.caption || slot.caption || "").trim();
        }
      }

      const missing = currentArticle.slots
        .filter((slot) => slot.required && !slot.uploadedFile)
        .map((slot) => slot.id);

      if (missing.length > 0) {
        const error = new Error("Required images missing");
        error.statusCode = 400;
        error.missing = missing;
        throw error;
      }

      let output = currentArticle.draftMarkdown;
      for (const slot of currentArticle.slots) {
        const placeholder = `{{slot:${slot.id}}}`;
        if (slot.uploadedFile && slot.alt && slot.caption) {
          output = output.replace(
            placeholder,
            buildImageBlock(slot.uploadedFile, slot.alt, slot.caption),
          );
        } else {
          output = output.replace(placeholder, "");
        }
      }

      output = output.replace(/\n{3,}/g, "\n\n").trim() + "\n";

      const articleDir = path.join(generatedArticlesDir, currentArticle.id);
      await fs.mkdir(articleDir, { recursive: true });
      const outputPath = path.join(articleDir, currentArticle.outputFileName);
      await fs.writeFile(outputPath, output, "utf8");

      currentArticle.publishReadyMarkdown = output;
      currentArticle.publishReadyPath = `/generated/articles/${currentArticle.id}/${currentArticle.outputFileName}`;
      currentArticle.updatedAt = nowIso();
      currentArticle.status = "publish_ready";

      await saveArticle(currentArticle);
      return currentArticle;
    });
    res.json({
      article,
      publicOutputPath: article.publishReadyPath,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Finalize failed",
      missing: error.missing || [],
      detail: String(error),
    });
  }
});

await ensureDirs();

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Editor app running at http://${host}:${port}`);
});

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
const generatedDir = path.join(__dirname, "generated");

app.use(express.json({ limit: "5mb" }));
app.use("/generated", express.static(generatedDir));
app.use(express.static(publicDir));

app.get("/healthz", async (_req, res) => {
  try {
    await fs.mkdir(generatedDir, { recursive: true });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

async function loadTemplate(templateId) {
  const jsonPath = path.join(templatesDir, `${templateId}.json`);
  const templateConfig = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  const markdownPath = path.join(templatesDir, templateConfig.templateFile);
  const markdown = await fs.readFile(markdownPath, "utf8");
  return { templateConfig, markdown };
}

function buildImageBlock(relativeImagePath, alt, caption) {
  return `![${alt}](${relativeImagePath})\n\nCaption: ${caption}`;
}

function safeSlug(value) {
  return String(value || "output")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildSeoFilename(templateConfig, slot, file) {
  const ext = (path.extname(file.originalname || "") || ".png").toLowerCase();
  if (slot.seoFileBase) {
    return `${safeSlug(slot.seoFileBase)}${ext}`;
  }
  const templateBase = safeSlug(
    templateConfig.slug ||
      templateConfig.outputFileName?.replace(/\.md$/i, "") ||
      templateConfig.id,
  );
  const slotBase = safeSlug(slot.id);
  return `${templateBase}-${slotBase}${ext}`.replace(/-+/g, "-");
}

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

app.post("/api/generate", upload.any(), async (req, res) => {
  try {
    const templateId = req.body.templateId;
    const metadata = JSON.parse(req.body.metadata || "{}");
    const { templateConfig, markdown } = await loadTemplate(templateId);
    const filesByField = new Map((req.files || []).map((file) => [file.fieldname, file]));
    const missing = [];

    for (const slot of templateConfig.slots) {
      const slotData = metadata[slot.id] || {};
      const hasFile = filesByField.has(slot.id);
      if (slot.required && (!hasFile || !slotData.alt || !slotData.caption)) {
        missing.push(slot.id);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing required slot data",
        missing,
      });
    }

    const runId = `${Date.now()}-${safeSlug(templateConfig.outputFileName)}`;
    const runDir = path.join(generatedDir, runId);
    const assetsDir = path.join(runDir, "assets");
    await fs.mkdir(assetsDir, { recursive: true });

    let output = markdown;
    const slotOutputs = {};

    for (const slot of templateConfig.slots) {
      const slotData = metadata[slot.id] || {};
      const file = filesByField.get(slot.id);
      const placeholder = `{{slot:${slot.id}}}`;

      if (!file || !slotData.alt || !slotData.caption) {
        output = output.replace(placeholder, "");
        continue;
      }

      const filename = buildSeoFilename(templateConfig, slot, file);
      const diskPath = path.join(assetsDir, filename);
      await fs.writeFile(diskPath, file.buffer);
      const relativeImagePath = `assets/${filename}`;
      const imageBlock = buildImageBlock(
        relativeImagePath,
        slotData.alt.trim(),
        slotData.caption.trim(),
      );
      output = output.replace(placeholder, imageBlock);
      slotOutputs[slot.id] = {
        image: relativeImagePath,
        alt: slotData.alt.trim(),
        caption: slotData.caption.trim(),
      };
    }

    output = output.replace(/\n{3,}/g, "\n\n").trim() + "\n";

    const outputPath = path.join(runDir, templateConfig.outputFileName);
    await fs.writeFile(outputPath, output, "utf8");

    res.json({
      runId,
      outputPath,
      publicOutputPath: `/generated/${runId}/${templateConfig.outputFileName}`,
      generatedMarkdown: output,
      slots: slotOutputs,
    });
  } catch (error) {
    res.status(500).json({ error: "Generation failed", detail: String(error) });
  }
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
await fs.mkdir(generatedDir, { recursive: true });
app.listen(port, host, () => {
  console.log(`Editor app running at http://${host}:${port}`);
});

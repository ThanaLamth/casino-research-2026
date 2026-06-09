const templateSelect = document.querySelector("#template-select");
const templateDescription = document.querySelector("#template-description");
const templateSummary = document.querySelector("#template-summary");
const draftPreview = document.querySelector("#draft-preview");
const slotForm = document.querySelector("#slot-form");
const requiredCount = document.querySelector("#required-count");
const generateBtn = document.querySelector("#generate-btn");
const statusEl = document.querySelector("#status");
const generatedOutput = document.querySelector("#generated-output");
const downloadLink = document.querySelector("#download-link");

let currentTemplate = null;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function renderTemplateSummary(template) {
  templateSummary.innerHTML = "";
  const items = [
    ["Output file", template.outputFileName],
    ["Required slots", String(template.slots.filter((slot) => slot.required).length)],
    ["Optional slots", String(template.slots.filter((slot) => !slot.required).length)],
  ];
  items.forEach(([label, value]) => {
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `<strong>${label}</strong><div>${value}</div>`;
    templateSummary.appendChild(div);
  });
}

function renderSlotCard(slot) {
  return `
    <article class="slot-card ${slot.required ? "required" : ""}" data-slot-id="${slot.id}">
      <div class="slot-top">
        <h3 class="slot-title">${slot.label}</h3>
        <span class="slot-required">${slot.required ? "Required" : "Optional"}</span>
      </div>
      <p class="slot-meta">
        <strong>Section:</strong> ${slot.section}<br />
        <strong>Why it matters:</strong> ${slot.whyItMatters}<br />
        <strong>Capture note:</strong> ${slot.captureNote}
      </p>
      <div class="slot-fields">
        <label class="field-label">
          Image file
          <input type="file" name="${slot.id}" accept="image/*" ${slot.required ? "required" : ""} />
        </label>
        <label class="field-label">
          Alt text
          <input type="text" data-alt-for="${slot.id}" value="${slot.defaultAlt || ""}" placeholder="Describe what the image actually shows" ${slot.required ? "required" : ""} />
        </label>
        <label class="field-label">
          Caption
          <input type="text" data-caption-for="${slot.id}" value="${slot.defaultCaption || ""}" placeholder="Explain why this image matters in the review" ${slot.required ? "required" : ""} />
        </label>
      </div>
    </article>
  `;
}

function renderTemplate(template) {
  currentTemplate = template;
  templateDescription.textContent = template.description;
  draftPreview.textContent = template.draft;
  renderTemplateSummary(template);
  slotForm.innerHTML = template.slots.map(renderSlotCard).join("");
  const required = template.slots.filter((slot) => slot.required).length;
  requiredCount.textContent = `${required} required image slots`;
  generatedOutput.value = "";
  downloadLink.classList.add("hidden");
  statusEl.textContent = "";
}

function collectMetadata() {
  const metadata = {};
  currentTemplate.slots.forEach((slot) => {
    const alt = document.querySelector(`[data-alt-for="${slot.id}"]`).value.trim();
    const caption = document.querySelector(`[data-caption-for="${slot.id}"]`).value.trim();
    metadata[slot.id] = { alt, caption };
  });
  return metadata;
}

async function loadTemplates() {
  const data = await fetchJson("/api/templates");
  templateSelect.innerHTML = data.templates
    .map((template) => `<option value="${template.id}">${template.title}</option>`)
    .join("");
  const initial = data.templates[0];
  if (initial) {
    const fullTemplate = await fetchJson(`/api/templates/${initial.id}`);
    renderTemplate(fullTemplate);
  }
}

templateSelect.addEventListener("change", async (event) => {
  const template = await fetchJson(`/api/templates/${event.target.value}`);
  renderTemplate(template);
});

generateBtn.addEventListener("click", async () => {
  if (!currentTemplate) return;
  generateBtn.disabled = true;
  statusEl.textContent = "Generating draft...";
  try {
    const formData = new FormData();
    formData.append("templateId", currentTemplate.id);
    formData.append("metadata", JSON.stringify(collectMetadata()));

    currentTemplate.slots.forEach((slot) => {
      const input = slotForm.querySelector(`input[name="${slot.id}"]`);
      if (input?.files?.[0]) {
        formData.append(slot.id, input.files[0]);
      }
    });

    const response = await fetch("/api/generate", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Generation failed");
    }
    generatedOutput.value = payload.generatedMarkdown;
    downloadLink.href = payload.publicOutputPath;
    downloadLink.classList.remove("hidden");
    statusEl.textContent = `Generated ${payload.outputPath}`;
  } catch (error) {
    statusEl.textContent = String(error.message || error);
  } finally {
    generateBtn.disabled = false;
  }
});

loadTemplates().catch((error) => {
  statusEl.textContent = String(error);
});

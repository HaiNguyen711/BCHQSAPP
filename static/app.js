const state = {
  schema: null,
  values: {},
  currentSectionIndex: 0,
};

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  if (page === "form") {
    await bootFormPage();
  }
  if (page === "admin") {
    bootAdminPage();
  }
});

async function bootFormPage() {
  const response = await fetch("/api/form-schema");
  state.schema = await response.json();
  seedInitialValues();
  renderForm();

  document.getElementById("prevStepBtn").addEventListener("click", () => {
    state.currentSectionIndex = Math.max(0, state.currentSectionIndex - 1);
    renderForm();
  });

  document.getElementById("nextStepBtn").addEventListener("click", () => {
    state.currentSectionIndex = Math.min(state.schema.sections.length - 1, state.currentSectionIndex + 1);
    renderForm();
  });

  document.getElementById("submitBtn").addEventListener("click", submitForm);
}

function seedInitialValues() {
  state.values = {};
  for (const section of state.schema.sections) {
    if (section.repeatable) {
      const count = Math.max(section.min_items || 0, 0);
      state.values[section.id] = Array.from({ length: count }, () => createEmptyGroup(section.fields));
    } else {
      state.values[section.id] = {};
      for (const field of section.fields) {
        state.values[section.id][field.id] = field.default || "";
      }
    }
  }
}

function createEmptyGroup(fields) {
  const item = {};
  for (const field of fields) {
    item[field.id] = field.default || "";
  }
  return item;
}

function renderForm() {
  const form = document.getElementById("citizenForm");
  form.innerHTML = "";

  state.schema.sections.forEach((section, index) => {
    const panel = document.createElement("section");
    panel.className = "section-panel";
    panel.hidden = index !== state.currentSectionIndex;

    const header = document.createElement("div");
    header.className = "section-panel__header";
    header.innerHTML = `<h3>${section.title}</h3><p>${section.description || ""}</p>`;
    panel.appendChild(header);

    if (section.repeatable) {
      panel.appendChild(renderRepeatableSection(section));
    } else {
      panel.appendChild(renderFieldGrid(section.id, section.fields, state.values[section.id]));
    }

    form.appendChild(panel);
  });

  updateProgress();
}

function renderRepeatableSection(section) {
  const wrap = document.createElement("div");
  wrap.className = "repeatable-list";

  const items = state.values[section.id];
  items.forEach((item, itemIndex) => {
    const card = document.createElement("div");
    card.className = "repeatable-card";

    const title = document.createElement("div");
    title.className = "repeatable-card__title";
    title.innerHTML = `<strong>${section.item_label || "Mục"} ${itemIndex + 1}</strong>`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "danger-btn";
    removeBtn.textContent = "Xóa";
    removeBtn.disabled = items.length <= (section.min_items || 0);
    removeBtn.addEventListener("click", () => {
      state.values[section.id].splice(itemIndex, 1);
      renderForm();
    });
    title.appendChild(removeBtn);

    card.appendChild(title);
    card.appendChild(renderFieldGrid(section.id, section.fields, item, itemIndex));
    wrap.appendChild(card);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "ghost-btn";
  addBtn.textContent = `Thêm ${section.item_label || "mục"}`;
  addBtn.addEventListener("click", () => {
    state.values[section.id].push(createEmptyGroup(section.fields));
    renderForm();
  });

  wrap.appendChild(addBtn);
  return wrap;
}

function renderFieldGrid(sectionId, fields, values, itemIndex = null) {
  const grid = document.createElement("div");
  grid.className = "stack";

  for (let i = 0; i < fields.length; i += 2) {
    const row = document.createElement("div");
    row.className = "field-row";
    row.appendChild(renderField(sectionId, fields[i], values, itemIndex));
    if (fields[i + 1]) {
      row.appendChild(renderField(sectionId, fields[i + 1], values, itemIndex));
    }
    grid.appendChild(row);
  }
  return grid;
}

function renderField(sectionId, field, values, itemIndex) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const label = document.createElement("label");
  label.textContent = field.label;
  if (field.required) {
    const requiredMark = document.createElement("span");
    requiredMark.textContent = " *";
    label.appendChild(requiredMark);
  }
  wrap.appendChild(label);

  const keyPath = itemIndex === null ? [sectionId, field.id] : [sectionId, itemIndex, field.id];

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
  } else if (field.type === "select") {
    input = document.createElement("select");
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "-- Chọn --";
    input.appendChild(emptyOption);
    (field.options || []).forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      input.appendChild(opt);
    });
  } else if (field.type === "radio") {
    input = document.createElement("div");
    input.className = "radio-group";
    (field.options || []).forEach((option) => {
      const optionLabel = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = keyPath.join(".");
      radio.value = option;
      radio.checked = values[field.id] === option;
      radio.addEventListener("change", () => updateValue(keyPath, option));
      optionLabel.appendChild(radio);
      optionLabel.append(option);
      input.appendChild(optionLabel);
    });
  } else {
    input = document.createElement("input");
    input.type = field.type || "text";
  }

  if (field.type !== "radio") {
    input.value = values[field.id] || "";
    input.placeholder = field.placeholder || "";
    input.addEventListener("input", (event) => updateValue(keyPath, event.target.value));
  }

  wrap.appendChild(input);
  return wrap;
}

function updateValue(keyPath, nextValue) {
  if (keyPath.length === 2) {
    state.values[keyPath[0]][keyPath[1]] = nextValue;
    return;
  }
  state.values[keyPath[0]][keyPath[1]][keyPath[2]] = nextValue;
}

function updateProgress() {
  const total = state.schema.sections.length;
  const current = state.currentSectionIndex + 1;
  document.getElementById("progressText").textContent = `Bước ${current}/${total}: ${state.schema.sections[state.currentSectionIndex].title}`;
  document.querySelector("#progressBar span").style.width = `${(current / total) * 100}%`;

  document.getElementById("prevStepBtn").disabled = state.currentSectionIndex === 0;
  document.getElementById("nextStepBtn").disabled = state.currentSectionIndex === total - 1;
}

async function submitForm() {
  const messageEl = document.getElementById("formMessage");
  messageEl.textContent = "Đang gửi dữ liệu...";
  messageEl.className = "form-message";

  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.values),
  });

  const result = await response.json();
  if (!response.ok) {
    const detail = result.fields ? ` ${Object.values(result.fields).join(" ")}` : "";
    messageEl.textContent = `${result.error || "Không thể gửi dữ liệu."}${detail}`;
    messageEl.classList.add("is-error");
    return;
  }

  messageEl.textContent = `${result.message} Mã phiếu: #${result.submission_id}.`;
  messageEl.classList.add("is-success");
  seedInitialValues();
  state.currentSectionIndex = 0;
  renderForm();
}

function bootAdminPage() {
  document.getElementById("loadAdminBtn").addEventListener("click", loadAdminData);
  document.getElementById("exportBtn").addEventListener("click", exportCsv);
}

async function loadAdminData() {
  const token = document.getElementById("adminToken").value.trim();
  const messageEl = document.getElementById("adminMessage");
  const tableWrap = document.getElementById("adminTableWrap");

  messageEl.textContent = "Đang tải dữ liệu...";
  messageEl.className = "form-message";

  const response = await fetch("/api/admin/submissions", {
    headers: { "X-Admin-Token": token },
  });

  const result = await response.json();
  if (!response.ok) {
    tableWrap.innerHTML = "";
    messageEl.textContent = result.error || "Không thể tải dữ liệu.";
    messageEl.classList.add("is-error");
    return;
  }

  messageEl.textContent = `Đã tải ${result.items.length} phiếu.`;
  messageEl.classList.add("is-success");
  tableWrap.innerHTML = renderAdminTable(result.items);
}

function renderAdminTable(items) {
  if (!items.length) {
    return "<p>Chưa có phiếu nào được gửi.</p>";
  }

  const rows = items.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${escapeHtml(item.full_name)}</td>
      <td>${escapeHtml(item.citizen_id_number)}</td>
      <td>${escapeHtml(item.phone || "")}</td>
      <td>${escapeHtml(item.current_residence || "")}</td>
      <td>${escapeHtml(item.created_at)}</td>
      <td><pre>${escapeHtml(JSON.stringify(item.payload, null, 2))}</pre></td>
    </tr>
  `).join("");

  return `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Họ tên</th>
          <th>CCCD</th>
          <th>Điện thoại</th>
          <th>Nơi ở hiện tại</th>
          <th>Thời gian tạo</th>
          <th>Dữ liệu</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function exportCsv() {
  const token = document.getElementById("adminToken").value.trim();
  if (!token) {
    const messageEl = document.getElementById("adminMessage");
    messageEl.textContent = "Vui lòng nhập admin token trước khi xuất CSV.";
    messageEl.className = "form-message is-error";
    return;
  }
  window.location.href = `/api/admin/export.csv?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

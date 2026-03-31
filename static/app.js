const state = {
  schema: null,
  values: {},
  currentSectionIndex: 0,
  showValidation: false,
  adminItems: [],
  adminCitizenIdFilter: "",
};

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  if (page === "form") {
    await bootFormPage();
  }
  if (page === "admin") {
    await bootAdminPage();
  }
});

async function bootFormPage() {
  const response = await fetch("/api/form-schema");
  state.schema = await response.json();
  seedInitialValues();
  renderForm();

  document.getElementById("prevStepBtn").addEventListener("click", () => {
    const visibleSections = getVisibleSections();
    state.showValidation = false;
    state.currentSectionIndex = Math.max(0, state.currentSectionIndex - 1);
    state.currentSectionIndex = Math.min(state.currentSectionIndex, visibleSections.length - 1);
    renderForm();
  });

  document.getElementById("nextStepBtn").addEventListener("click", () => {
    const visibleSections = getVisibleSections();
    if (!isCurrentSectionValid()) {
      state.showValidation = true;
      renderForm();
      return;
    }
    state.showValidation = false;
    state.currentSectionIndex = Math.min(visibleSections.length - 1, state.currentSectionIndex + 1);
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
  const visibleSections = getVisibleSections();
  state.currentSectionIndex = Math.min(state.currentSectionIndex, visibleSections.length - 1);
  const activeSectionErrors = getCurrentSectionErrors();

  visibleSections.forEach((section, index) => {
    const panel = document.createElement("section");
    panel.className = "section-panel";
    panel.hidden = index !== state.currentSectionIndex;

    const header = document.createElement("div");
    header.className = "section-panel__header";
    header.innerHTML = `<h3>${section.title}</h3><p>${section.description || ""}</p>`;
    panel.appendChild(header);

    if (section.repeatable) {
      panel.appendChild(renderRepeatableSection(section, activeSectionErrors));
    } else {
      panel.appendChild(renderFieldGrid(section.id, section.fields, state.values[section.id], null, activeSectionErrors));
    }

    form.appendChild(panel);
  });

  updateProgress();
}

function renderRepeatableSection(section, errors) {
  const wrap = document.createElement("div");
  wrap.className = "repeatable-list";

  if (errors[section.id]) {
    const errorEl = document.createElement("div");
    errorEl.className = "field-error";
    errorEl.textContent = errors[section.id];
    wrap.appendChild(errorEl);
  }

  const items = state.values[section.id];
  items.forEach((item, itemIndex) => {
    const card = document.createElement("div");
    card.className = "repeatable-card";

    const title = document.createElement("div");
    title.className = "repeatable-card__title";
    title.innerHTML = `<strong>${section.item_label || "Mục"} ${itemIndex}</strong>`;

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
    card.appendChild(renderFieldGrid(section.id, section.fields, item, itemIndex, errors));
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

function renderFieldGrid(sectionId, fields, values, itemIndex = null, errors = {}) {
  const grid = document.createElement("div");
  grid.className = "stack";

  for (let i = 0; i < fields.length; i += 2) {
    const row = document.createElement("div");
    row.className = "field-row";
    const firstField = fields[i];
    row.appendChild(renderField(sectionId, firstField, values, itemIndex, errors));
    if (firstField.type === "textarea") {
      grid.appendChild(row);
      continue;
    }

    if (fields[i + 1]) {
      row.appendChild(renderField(sectionId, fields[i + 1], values, itemIndex, errors));
    }
    grid.appendChild(row);
  }
  return grid;
}

function renderField(sectionId, field, values, itemIndex, errors) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  if (field.type === "textarea") {
    wrap.classList.add("field--full");
  }

  const label = document.createElement("label");
  label.textContent = field.label;
  if (field.required) {
    const requiredMark = document.createElement("span");
    requiredMark.textContent = " *";
    label.appendChild(requiredMark);
  }
  wrap.appendChild(label);

  const keyPath = itemIndex === null ? [sectionId, field.id] : [sectionId, itemIndex, field.id];
  const fieldKey = keyPath.join(".");
  const errorMessage = errors[fieldKey];
  if (errorMessage) {
    wrap.classList.add("is-invalid");
  }

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
  } else if (field.type === "date") {
    input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 10;
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
    input.placeholder = field.placeholder || (field.type === "date" ? "dd/mm/yyyy" : "");
    input.addEventListener("input", (event) => {
      const nextValue = field.type === "date" ? formatDateInput(event.target.value) : event.target.value;
      event.target.value = nextValue;
      updateValue(keyPath, nextValue);
    });
    input.required = Boolean(field.required);
  }

  wrap.appendChild(input);
  if (errorMessage) {
    const errorEl = document.createElement("div");
    errorEl.className = "field-error";
    errorEl.textContent = errorMessage;
    wrap.appendChild(errorEl);
  }
  return wrap;
}

function updateValue(keyPath, nextValue) {
  if (keyPath.length === 2) {
    state.values[keyPath[0]][keyPath[1]] = nextValue;
  } else {
    state.values[keyPath[0]][keyPath[1]][keyPath[2]] = nextValue;
  }

  const visibleSections = getVisibleSections();
  state.currentSectionIndex = Math.min(state.currentSectionIndex, visibleSections.length - 1);

  if (state.showValidation) {
    renderForm();
    return;
  }
  updateProgress();
}

function updateProgress() {
  const visibleSections = getVisibleSections();
  const total = visibleSections.length;
  const current = state.currentSectionIndex + 1;
  document.getElementById("progressText").textContent = `Bước ${current}/${total}: ${visibleSections[state.currentSectionIndex].title}`;
  document.querySelector("#progressBar span").style.width = `${(current / total) * 100}%`;

  const prevBtn = document.getElementById("prevStepBtn");
  const nextBtn = document.getElementById("nextStepBtn");
  const submitBtn = document.getElementById("submitBtn");

  const isFirstStep = state.currentSectionIndex === 0;
  const isLastStep = state.currentSectionIndex === total - 1;
  const currentSectionValid = isCurrentSectionValid();

  prevBtn.disabled = isFirstStep;
  prevBtn.hidden = isFirstStep;
  nextBtn.hidden = isLastStep;
  nextBtn.disabled = !isLastStep && !currentSectionValid;
  submitBtn.hidden = !isLastStep;
  submitBtn.disabled = isLastStep && !currentSectionValid;
}

async function submitForm() {
  const messageEl = document.getElementById("formMessage");
  const firstInvalidSectionIndex = getFirstInvalidSectionIndex();
  if (firstInvalidSectionIndex !== -1) {
    state.currentSectionIndex = firstInvalidSectionIndex;
    state.showValidation = true;
    renderForm();
    messageEl.textContent = "Vui lòng nhập đầy đủ tất cả các trường bắt buộc trước khi gửi.";
    messageEl.className = "form-message form-message--sheet is-error";
    return;
  }

  messageEl.textContent = "Đang gửi dữ liệu...";
  messageEl.className = "form-message form-message--sheet";

  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.values),
  });

  const result = await response.json();
  if (!response.ok) {
    state.showValidation = true;
    const detail = result.fields ? ` ${Object.values(result.fields).join(" ")}` : "";
    messageEl.textContent = `${result.error || "Không thể gửi dữ liệu."}${detail}`;
    messageEl.className = "form-message form-message--sheet is-error";
    renderForm();
    return;
  }

  messageEl.textContent = `${result.message} Mã phiếu: #${result.submission_id}.`;
  messageEl.className = "form-message form-message--sheet is-success";
  seedInitialValues();
  state.currentSectionIndex = 0;
  state.showValidation = false;
  renderForm();
}

function isCurrentSectionValid() {
  return Object.keys(getCurrentSectionErrors()).length === 0;
}

function getCurrentSectionErrors() {
  const section = getVisibleSections()[state.currentSectionIndex];
  return validateSection(section, state.values[section.id], state.showValidation);
}

function getFirstInvalidSectionIndex() {
  const visibleSections = getVisibleSections();
  for (let index = 0; index < visibleSections.length; index += 1) {
    const section = visibleSections[index];
    const errors = validateSection(section, state.values[section.id], true);
    if (Object.keys(errors).length) {
      return index;
    }
  }
  return -1;
}

function validateSection(section, sectionValue, includeMessages) {
  const errors = {};
  if (section.repeatable) {
    const items = Array.isArray(sectionValue) ? sectionValue : [];
    if (items.length < (section.min_items || 0) && includeMessages) {
      errors[section.id] = `Cần ít nhất ${section.min_items} ${section.item_label || "mục"}.`;
    } else if (items.length < (section.min_items || 0)) {
      errors[section.id] = "";
    }
    items.forEach((item, itemIndex) => {
      section.fields.forEach((field) => {
        const fieldValue = item?.[field.id];
        if (!field.required || !isBlankValue(item?.[field.id])) {
          if (field.type === "date" && !isBlankValue(fieldValue) && !isValidDateValue(fieldValue)) {
            errors[[section.id, itemIndex, field.id].join(".")] = "Ngày phải theo định dạng dd/mm/yyyy.";
          }
          return;
        }
        if (includeMessages) {
          errors[[section.id, itemIndex, field.id].join(".")] = `${field.label} là bắt buộc.`;
        } else {
          errors[[section.id, itemIndex, field.id].join(".")] = "";
        }
      });
    });
    return errors;
  }

  section.fields.forEach((field) => {
    const fieldValue = sectionValue?.[field.id];
    if (!field.required || !isBlankValue(sectionValue?.[field.id])) {
      if (field.type === "date" && !isBlankValue(fieldValue) && !isValidDateValue(fieldValue)) {
        errors[[section.id, field.id].join(".")] = "Ngày phải theo định dạng dd/mm/yyyy.";
      }
      return;
    }
    if (includeMessages) {
      errors[[section.id, field.id].join(".")] = `${field.label} là bắt buộc.`;
    } else {
      errors[[section.id, field.id].join(".")] = "";
    }
  });
  return errors;
}

function isBlankValue(value) {
  if (value === null || value === undefined) {
    return true;
  }
  return String(value).trim() === "";
}

function formatDateInput(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDateValue(value) {
  const raw = String(value).trim();
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return false;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number.parseInt(dayText, 10);
  const month = Number.parseInt(monthText, 10);
  const year = Number.parseInt(yearText, 10);

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const lastDay = new Date(year, month, 0).getDate();
  return day <= lastDay;
}

function getVisibleSections() {
  return state.schema.sections.filter((section) => {
    if (section.id !== "siblings") {
      return true;
    }

    const totalChildrenRaw = state.values.family_basic?.total_children;
    const totalChildren = Number.parseInt(totalChildrenRaw, 10);
    return Number.isNaN(totalChildren) || totalChildren > 1;
  });
}

async function bootAdminPage() {
  document.getElementById("loginAdminBtn").addEventListener("click", loginAdmin);
  document.getElementById("refreshAdminBtn").addEventListener("click", loadAdminData);
  document.getElementById("logoutAdminBtn").addEventListener("click", logoutAdmin);
  document.getElementById("exportBtn").addEventListener("click", exportCsv);
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
  document.getElementById("adminSearchCitizenId").addEventListener("input", handleAdminCitizenIdSearch);

  const response = await fetch("/api/admin/session");
  const session = await response.json();
  if (session.authenticated) {
    showAdminDashboard();
    await loadAdminData();
  } else {
    showAdminLogin();
  }
}

function showAdminLogin() {
  document.getElementById("adminLoginCard").hidden = false;
  document.getElementById("adminDashboardCard").hidden = true;
}

function showAdminDashboard() {
  document.getElementById("adminLoginCard").hidden = true;
  document.getElementById("adminDashboardCard").hidden = false;
}

async function loginAdmin() {
  const token = document.getElementById("adminToken").value.trim();
  const messageEl = document.getElementById("adminLoginMessage");

  messageEl.textContent = "Đang đăng nhập...";
  messageEl.className = "form-message";

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const result = await response.json();
  if (!response.ok) {
    messageEl.textContent = result.error || "Không thể đăng nhập.";
    messageEl.classList.add("is-error");
    return;
  }

  messageEl.textContent = result.message;
  messageEl.classList.add("is-success");
  showAdminDashboard();
  await loadAdminData();
}

async function logoutAdmin() {
  await fetch("/api/admin/logout", { method: "POST" });
  document.getElementById("adminToken").value = "";
  document.getElementById("adminSearchCitizenId").value = "";
  document.getElementById("adminLoginMessage").textContent = "";
  document.getElementById("adminMessage").textContent = "";
  document.getElementById("adminTableWrap").innerHTML = "";
  document.getElementById("adminSummaryCards").innerHTML = "";
  document.getElementById("adminSummaryLists").innerHTML = "";
  state.adminItems = [];
  state.adminCitizenIdFilter = "";
  showAdminLogin();
}

async function loadAdminData() {
  const messageEl = document.getElementById("adminMessage");
  const tableWrap = document.getElementById("adminTableWrap");

  messageEl.textContent = "Đang tải dữ liệu quản trị...";
  messageEl.className = "form-message";

  const [summaryResponse, submissionsResponse] = await Promise.all([
    fetch("/api/admin/summary"),
    fetch("/api/admin/submissions"),
  ]);

  if (summaryResponse.status === 401 || submissionsResponse.status === 401) {
    showAdminLogin();
    messageEl.textContent = "";
    return;
  }

  const summary = await summaryResponse.json();
  const submissions = await submissionsResponse.json();
  state.adminItems = submissions.items || [];

  document.getElementById("adminSummaryCards").innerHTML = renderSummaryCards(summary);
  document.getElementById("adminSummaryLists").innerHTML = renderSummaryLists(summary);
  renderAdminTableWrap();

  messageEl.textContent = `Đã tải ${state.adminItems.length} phiếu.`;
  messageEl.className = "form-message is-success";
}

function handleAdminCitizenIdSearch(event) {
  state.adminCitizenIdFilter = event.target.value.trim();
  renderAdminTableWrap();
}

function renderAdminTableWrap() {
  const tableWrap = document.getElementById("adminTableWrap");
  const messageEl = document.getElementById("adminMessage");
  const items = getFilteredAdminItems();
  tableWrap.innerHTML = renderAdminTable(items);

  if (!state.adminItems.length) {
    return;
  }

  if (state.adminCitizenIdFilter) {
    messageEl.textContent = `Tìm thấy ${items.length}/${state.adminItems.length} phiếu theo CCCD.`;
    messageEl.className = "form-message is-success";
  }
}

function getFilteredAdminItems() {
  if (!state.adminCitizenIdFilter) {
    return state.adminItems;
  }

  const normalizedFilter = normalizeDigits(state.adminCitizenIdFilter);
  return state.adminItems.filter((item) => normalizeDigits(item.citizen_id_number || "").includes(normalizedFilter));
}

function renderSummaryCards(summary) {
  const cards = [
    { label: "Tổng số phiếu", value: summary.total_submissions || 0 },
    { label: "Phiếu hôm nay", value: summary.today_submissions || 0 },
    { label: "CCCD duy nhất", value: summary.unique_citizen_ids || 0 },
  ];

  return cards.map((card) => `
    <div class="stat-card">
      <div class="stat-card__label">${escapeHtml(card.label)}</div>
      <div class="stat-card__value">${escapeHtml(card.value)}</div>
    </div>
  `).join("");
}

function renderSummaryLists(summary) {
  const groups = [
    { title: "Top khu phố", items: summary.top_neighborhoods || [] },
    { title: "Top số lượng theo năm sinh", items: summary.top_birth_years || [] },
    { title: "Top phường", items: summary.top_wards || [] },
    { title: "Top trình độ đào tạo", items: summary.top_training_levels || [] },
  ];

  return groups.map((group) => `
    <div class="summary-card">
      <h3>${escapeHtml(group.title)}</h3>
      ${renderSummaryListItems(group.items)}
    </div>
  `).join("");
}

function renderSummaryListItems(items) {
  if (!items.length) {
    return "<p>Chưa có dữ liệu.</p>";
  }

  return `
    <ul class="summary-list">
      ${items.map((item) => `
        <li>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.count)}</strong>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderAdminTable(items) {
  if (!items.length) {
    return "<p>Chưa có phiếu nào được gửi.</p>";
  }

  const rows = items.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${renderCitizenPrimaryInfo(item)}</td>
      <td>${renderCitizenLocationInfo(item)}</td>
      <td>${renderCitizenFamilyInfo(item)}</td>
      <td>${renderCitizenTimelineInfo(item)}</td>
      <td>${escapeHtml(formatDateTime(item.created_at))}</td>
      <td>${renderCitizenPayloadDetails(item)}</td>
    </tr>
  `).join("");

  return `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Thông tin công dân</th>
          <th>Địa bàn</th>
          <th>Gia đình</th>
          <th>Quá trình</th>
          <th>Thời gian tạo</th>
          <th>Chi tiết</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderCitizenPrimaryInfo(item) {
  const personal = item.payload?.personal_basic || {};
  const pieces = [
    { label: "Họ tên", value: item.full_name },
    { label: "Giới tính", value: personal.gender },
    { label: "Ngày sinh", value: personal.date_of_birth },
    { label: "CCCD", value: item.citizen_id_number },
    { label: "Điện thoại", value: item.phone },
  ].filter((piece) => piece.value);

  return renderKeyValueList(pieces);
}

function renderCitizenLocationInfo(item) {
  const personal = item.payload?.personal_basic || {};
  const pieces = [
    { label: "Khu phố", value: personal.neighborhood },
    { label: "Phường", value: personal.ward },
    { label: "Tỉnh/Thành", value: personal.province },
    { label: "Quê quán", value: personal.hometown },
    { label: "Nơi ở hiện tại", value: item.current_residence },
  ].filter((piece) => piece.value);

  return renderKeyValueList(pieces);
}

function renderCitizenFamilyInfo(item) {
  const family = item.payload?.family_basic || {};
  const pieces = [
    { label: "Cha", value: family.father_name },
    { label: "Mẹ", value: family.mother_name },
    { label: "Nhà có", value: family.total_children ? `${family.total_children} con` : "" },
    { label: "Con thứ", value: family.birth_order },
    { label: "Con trai", value: family.sons_count },
    { label: "Con gái", value: family.daughters_count },
  ].filter((piece) => piece.value);

  return renderKeyValueList(pieces);
}

function renderCitizenTimelineInfo(item) {
  const personalHistory = item.payload?.personal_history || [];
  const fatherHistory = item.payload?.father_history || [];
  const motherHistory = item.payload?.mother_history || [];

  const pieces = [
    { label: "Bản thân", value: `${personalHistory.length} giai đoạn` },
    { label: "Cha", value: `${fatherHistory.length} giai đoạn` },
    { label: "Mẹ", value: `${motherHistory.length} giai đoạn` },
    { label: "Anh chị em", value: `${(item.payload?.siblings || []).length} người` },
  ];

  return renderKeyValueList(pieces);
}

function renderCitizenPayloadDetails(item) {
  const personal = item.payload?.personal_basic || {};
  const summaryPieces = [
    { label: "Dân tộc", value: personal.ethnicity },
    { label: "Tôn giáo", value: personal.religion },
    { label: "Quốc tịch", value: personal.nationality },
    { label: "Nghề nghiệp", value: personal.occupation },
    { label: "Nơi làm việc", value: personal.workplace },
  ].filter((piece) => piece.value);

  return `
    <div class="admin-detail-stack">
      ${renderKeyValueList(summaryPieces)}
      <details class="admin-json-details">
        <summary>Xem JSON gốc</summary>
        <pre>${escapeHtml(JSON.stringify(item.payload, null, 2))}</pre>
      </details>
    </div>
  `;
}

function renderKeyValueList(items) {
  if (!items.length) {
    return "<span class=\"admin-empty\">-</span>";
  }

  return `
    <dl class="admin-kv-list">
      ${items.map((item) => `
        <div>
          <dt>${escapeHtml(item.label)}</dt>
          <dd>${escapeHtml(item.value)}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function normalizeDigits(value) {
  return String(value).replace(/\D/g, "");
}

function exportCsv() {
  window.location.href = "/api/admin/export.csv";
}

function exportExcel() {
  window.location.href = "/api/admin/export.xlsx";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

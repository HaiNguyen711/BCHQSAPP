const state = {
  schema: null,
  values: {},
  currentSectionIndex: 0,
  showValidation: false,
  selectedFormCode: "",
  formOptions: [],
  adminItems: [],
  adminInterestItems: [],
  adminCitizenIdFilter: "",
  adminPage: 1,
  adminPageSize: 10,
  adminTotalItems: 0,
  adminTotalPages: 1,
  currentAdminModalItem: null,
  currentAdminModalMode: "",
  currentAdminModalTab: "personal",
  reviewModalOpen: false,
  isSubmitting: false,
};

window.state = state;

const ACTIVE_FORM_CODES = new Set(["1", "2"]);
const NEIGHBORHOOD_OPTIONS = [
  "Hoa L\u01b0",
  "Quanh Vinh",
  "C\u00e2y Ch\u00e0m",
  "B\u00ecnh Thi\u1ec1n",
  "B\u1eedu S\u01a1n",
  "H\u00f2a B\u00ecnh",
  "X\u00f3m V\u01b0\u1eddn",
  "Th\u00e0nh Th\u00e1i",
  "T\u00e2n L\u00e2n",
  "S\u00e2n Bay",
  "Th\u1ed1ng Nh\u1ea5t",
  "M\u01b0\u01a1ng Sao",
  "Nh\u00e0 Xanh",
  "G\u00f2 Me",
  "B\u00ecnh Tr\u01b0\u1edbc",
  "\u0110\u1ea1i Ph\u01b0\u1edbc",
  "Vinh Th\u1ea1nh",
  "Nh\u1ea5t H\u00f2a",
  "Nh\u1ecb H\u00f2a",
  "Tam H\u00f2a",
  "B\u00ecnh \u0110a",
  "B\u1ebfn \u0110\u00e1",
  "\u0110\u1ed3ng T\u00e2m",
  "B\u00ecnh An",
  "An B\u00ecnh",
  "Lam S\u01a1n",
  "An H\u1ea3o",
  "\u0110o\u00e0n K\u1ebft",
  "Khu C\u00f4ng Nghi\u1ec7p",
  "T\u00e2n B\u00ecnh",
  "KP5 An B\u00ecnh",
  "V\u01b0\u1eddn M\u00edt",
  "Nam H\u00e0",
  "Trung D\u0169ng",
  "Bi\u00ean H\u00f9ng",
  "Trung Ki\u00ean",
  "Phi Tr\u01b0\u1eddng",
  "Ng\u00e3 Ba Th\u00e0nh",
  "Thanh B\u00ecnh",
  "S\u00f4ng Ph\u1ed1",
  "Kh\u00e1nh H\u01b0ng",
  "Quy\u1ebft Th\u1eafng",
  "Ph\u01b0\u1edbc L\u01b0",
  "C\u00f4ng L\u00fd",
  "B\u00ecnh Th\u00e0nh",
  "T\u00e2n L\u1ea1i",
  "T\u00e2n Th\u00e0nh",
  "T\u00e2n B\u1eedu",
  "B\u1eedu Long",
];

const FORM_DESCRIPTIONS = {
  "1": "Mục Đăng ký NVQS đang dùng giao diện kê khai hiện tại.",
  "2": "Mục Phúc tra NVQS đang dùng giao diện kê khai hiện tại.",
  "3": "Mục Dân quân tự vệ đang phát triển. Hệ thống sẽ ghi nhận nhu cầu này cho admin.",
  "4": "Mục Dự bị động viên đang phát triển. Hệ thống sẽ ghi nhận nhu cầu này cho admin.",
  "5": "Mục Sĩ quan dự bị đang phát triển. Hệ thống sẽ ghi nhận nhu cầu này cho admin.",
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

window.addEventListener("load", () => {
  if (document.body.dataset.page === "form") {
    closeReviewModal();
  }
});

window.addEventListener("pageshow", () => {
  if (document.body.dataset.page === "form") {
    closeReviewModal();
  }
});

async function bootFormPage() {
  state.formOptions = Array.isArray(window.APP_BOOTSTRAP?.formOptions) ? window.APP_BOOTSTRAP.formOptions : [];
  closeReviewModal();

  const response = await fetch("/api/form-schema?v=20260421-2", { cache: "no-store" });
  state.schema = await response.json();
  seedInitialValues();
  renderFormSelector();
  wireFormEvents();

  const params = new URLSearchParams(window.location.search);
  const initialFormCode = params.get("form") || "";
  if (ACTIVE_FORM_CODES.has(initialFormCode) && window.location.hash === "#active-form") {
    setSelectedForm(initialFormCode, false);
    window.setTimeout(() => scrollToActiveFormCard(), 120);
  }
}

function wireFormEvents() {
  document.getElementById("formSelector").addEventListener("click", handleFormSelectorClick);

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

  document.getElementById("submitBtn").addEventListener("click", previewSubmitForm);
  document.getElementById("reviewCloseBtn").addEventListener("click", closeReviewModal);
  document.getElementById("reviewConfirmBtn").addEventListener("click", submitForm);
  document.getElementById("reviewModal").addEventListener("click", handleReviewModalClick);
  document.addEventListener("keydown", handleReviewModalKeydown);
}

function handleFormSelectorClick(event) {
  const button = event.target.closest("[data-form-code]");
  if (!button) {
    return;
  }

  const formCode = button.dataset.formCode || "";
  if (ACTIVE_FORM_CODES.has(formCode)) {
    openSelectedForm(formCode);
    return;
  }

  void trackDevelopingForm(formCode);
}

function renderFormSelector() {
  const selector = document.getElementById("formSelector");
  selector.innerHTML = state.formOptions.map((option) => {
    const isActive = state.selectedFormCode === option.code;
    const isAvailable = ACTIVE_FORM_CODES.has(option.code);
    return `
      <article class="form-choice-card${isActive ? " is-active" : ""}${isAvailable ? "" : " is-locked"}">
        <div class="form-choice-card__meta">
          <span class="form-choice-card__code">Mục ${escapeHtml(option.code)}</span>
          <span class="form-choice-card__status ${isAvailable ? "is-ready" : "is-pending"}">${isAvailable ? "Đã mở" : "Đang phát triển"}</span>
        </div>
        <h3>${escapeHtml(option.label)}</h3>
        <p>${escapeHtml(FORM_DESCRIPTIONS[option.code] || "")}</p>
        <button type="button" class="${isAvailable ? "primary-btn" : "ghost-btn"}" data-form-code="${escapeHtml(option.code)}">
          ${isAvailable ? "Chọn mục này" : "Ghi nhận nhu cầu"}
        </button>
      </article>
    `;
  }).join("");
}

function openSelectedForm(formCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("form", formCode);
  url.hash = "active-form";
  window.location.assign(url.toString());
}

function setSelectedForm(formCode, shouldScroll = true) {
  state.selectedFormCode = formCode;
  state.currentSectionIndex = 0;
  state.showValidation = false;
  seedInitialValues();
  renderFormSelector();
  updateSelectionMessage(`Đã chọn ${getSelectedFormLabel()}.`, "success");

  const params = new URLSearchParams(window.location.search);
  params.set("form", formCode);
  const nextHash = shouldScroll ? "#active-form" : window.location.hash;
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${nextHash}`);

  updateActiveFormCard();
  renderForm();

  if (shouldScroll) {
    scrollToActiveFormCard();
  }
}

async function trackDevelopingForm(formCode) {
  const selectionMessage = document.getElementById("selectionMessage");
  selectionMessage.textContent = "Đang ghi nhận lựa chọn...";
  selectionMessage.className = "form-message form-message--sheet";

  const response = await fetch("/api/form-interest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form_code: formCode, source: "landing" }),
  });
  const result = await response.json();

  if (!response.ok) {
    updateSelectionMessage(result.error || "Không thể ghi nhận lựa chọn.", "error");
    return;
  }

  state.selectedFormCode = formCode;
  renderFormSelector();
  document.getElementById("activeFormCard").hidden = true;
  updateSelectionMessage(`${result.form_label} hiện đang phát triển. BCHQS đã nhận được nhu cầu này.`, "success");
}

function updateSelectionMessage(text, type = "") {
  const messageEl = document.getElementById("selectionMessage");
  messageEl.textContent = text;
  messageEl.className = "form-message form-message--sheet";
  if (type === "error") {
    messageEl.classList.add("is-error");
  }
  if (type === "success") {
    messageEl.classList.add("is-success");
  }
}

function updateActiveFormCard() {
  const card = document.getElementById("activeFormCard");
  const isActiveForm = ACTIVE_FORM_CODES.has(state.selectedFormCode);
  card.hidden = !isActiveForm;
  if (!isActiveForm) {
    return;
  }

  document.getElementById("activeFormTitle").textContent = `Mục kê khai: ${getSelectedFormLabel()}`;
  document.getElementById("activeFormDescription").textContent = FORM_DESCRIPTIONS[state.selectedFormCode] || "";
}

function getSelectedFormLabel() {
  const selected = state.formOptions.find((option) => option.code === state.selectedFormCode);
  return selected ? selected.label : "Mục kê khai thông tin";
}

function scrollToActiveFormCard() {
  const card = document.getElementById("activeFormCard");
  if (card.hidden) {
    return;
  }

  window.requestAnimationFrame(() => {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    window.location.hash = "active-form";
    const title = document.getElementById("activeFormTitle");
    if (title) {
      title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    }
  });
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
  syncCurrentResidence();
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

  if (!ACTIVE_FORM_CODES.has(state.selectedFormCode)) {
    return;
  }

  const visibleSections = getVisibleSections();
  state.currentSectionIndex = Math.min(state.currentSectionIndex, visibleSections.length - 1);
  const activeSectionErrors = getCurrentSectionErrors();

  visibleSections.forEach((section, index) => {
    const panel = document.createElement("section");
    panel.className = "section-panel";
    panel.hidden = index !== state.currentSectionIndex;

    const header = document.createElement("div");
    header.className = "section-panel__header";
    header.innerHTML = `<h3>${section.title}</h3>`;
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
    const selectOptions = field.options || [];
    selectOptions.forEach((option) => {
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
    input.dataset.fieldKey = fieldKey;
    input.value = values[field.id] || "";
    input.placeholder = field.placeholder || (field.type === "date" ? "dd/mm/yyyy" : "");
    input.addEventListener("input", (event) => {
      const nextValue = field.type === "date" ? formatDateInput(event.target.value) : event.target.value;
      event.target.value = nextValue;
      updateValue(keyPath, nextValue);
      if (sectionId === "personal_basic" && ["street_address", "neighborhood", "ward", "province"].includes(field.id)) {
        syncCurrentResidenceFromDom();
      }
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
    if (keyPath[0] === "personal_basic") {
      syncCurrentResidence();
    }
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

function syncCurrentResidence() {
  const personal = state.values.personal_basic;
  if (!personal) {
    return;
  }

  const addressParts = [
    personal.street_address,
    personal.neighborhood,
    personal.ward,
    personal.province,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  personal.current_residence = addressParts.join(", ");
  personal.family_permanent_residence = personal.current_residence;

  const residenceField = document.querySelector('[data-field-key="personal_basic.current_residence"]');
  if (residenceField) {
    residenceField.value = personal.current_residence;
  }
  const familyResidenceField = document.querySelector('[data-field-key="personal_basic.family_permanent_residence"]');
  if (familyResidenceField) {
    familyResidenceField.value = personal.family_permanent_residence;
  }
}

function syncCurrentResidenceFromDom() {
  const personal = state.values.personal_basic;
  if (!personal) {
    return;
  }

  const streetField = document.querySelector('[data-field-key="personal_basic.street_address"]');
  const neighborhoodField = document.querySelector('[data-field-key="personal_basic.neighborhood"]');
  const wardField = document.querySelector('[data-field-key="personal_basic.ward"]');
  const provinceField = document.querySelector('[data-field-key="personal_basic.province"]');
  const residenceField = document.querySelector('[data-field-key="personal_basic.current_residence"]');
  const familyResidenceField = document.querySelector('[data-field-key="personal_basic.family_permanent_residence"]');

  const addressParts = [
    streetField?.value || personal.street_address,
    neighborhoodField?.value || personal.neighborhood,
    wardField?.value || personal.ward,
    provinceField?.value || personal.province,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const nextResidence = addressParts.join(", ");
  personal.current_residence = nextResidence;
  personal.family_permanent_residence = nextResidence;

  if (residenceField) {
    residenceField.value = nextResidence;
  }
  if (familyResidenceField) {
    familyResidenceField.value = nextResidence;
  }
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

async function previewSubmitForm() {
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
  messageEl.textContent = "";
  openReviewModal();
  return;

  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      form_code: state.selectedFormCode,
      payload: state.values,
    }),
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

  messageEl.textContent = `${result.message} Loại phiếu: ${result.form_label}. Mã phiếu: #${result.submission_id}.`;
  messageEl.className = "form-message form-message--sheet is-success";
  seedInitialValues();
  state.currentSectionIndex = 0;
  state.showValidation = false;
  renderForm();
}

async function submitForm() {
  if (state.isSubmitting) {
    return;
  }

  const messageEl = document.getElementById("formMessage");
  const reviewMessageEl = document.getElementById("reviewModalMessage");
  const confirmBtn = document.getElementById("reviewConfirmBtn");
  const closeBtn = document.getElementById("reviewCloseBtn");

  state.isSubmitting = true;
  confirmBtn.disabled = true;
  closeBtn.disabled = true;

  messageEl.textContent = "Đang gửi dữ liệu...";
  messageEl.className = "form-message form-message--sheet";
  reviewMessageEl.textContent = "Đang gửi dữ liệu...";
  reviewMessageEl.className = "form-message form-message--sheet";

  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      form_code: state.selectedFormCode,
      payload: state.values,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    state.showValidation = true;
    const detail = result.fields ? ` ${Object.values(result.fields).join(" ")}` : "";
    messageEl.textContent = `${result.error || "Không thể gửi dữ liệu."}${detail}`;
    messageEl.className = "form-message form-message--sheet is-error";
    reviewMessageEl.textContent = `${result.error || "Không thể gửi dữ liệu."}${detail}`;
    reviewMessageEl.className = "form-message form-message--sheet is-error";
    state.isSubmitting = false;
    confirmBtn.disabled = false;
    closeBtn.disabled = false;
    renderForm();
    return;
  }

  closeReviewModal();
  messageEl.textContent = `Đã gửi thông tin thành công. Loại phiếu: ${result.form_label}. Mã phiếu: #${result.submission_id}.`;
  messageEl.className = "form-message form-message--sheet is-success";
  seedInitialValues();
  state.currentSectionIndex = 0;
  state.showValidation = false;
  state.isSubmitting = false;
  confirmBtn.disabled = false;
  closeBtn.disabled = false;
  renderForm();
  messageEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

function buildDraftSubmissionItem() {
  const personal = state.values.personal_basic || {};
  return {
    form_code: state.selectedFormCode,
    full_name: personal.full_name || "",
    citizen_id_number: personal.citizen_id_number || "",
    phone: personal.phone || "",
    payload: JSON.parse(JSON.stringify(state.values)),
  };
}

function openReviewModal() {
  const modal = document.getElementById("reviewModal");
  const content = document.getElementById("reviewModalContent");
  const title = document.getElementById("reviewModalTitle");
  const subtitle = document.getElementById("reviewModalSubtitle");
  const reviewMessageEl = document.getElementById("reviewModalMessage");
  const draftItem = buildDraftSubmissionItem();

  title.textContent = `Xem lại thông tin - ${getSelectedFormLabel()}`;
  subtitle.textContent = "Kiểm tra toàn bộ thông tin đã nhập. Nếu đúng, bấm Xác nhận gửi.";
  reviewMessageEl.textContent = "";
  reviewMessageEl.className = "form-message form-message--sheet";
  content.innerHTML = `
    ${renderDetailPanelPersonal(draftItem)}
    ${renderDetailPanelFamily(draftItem)}
  `;

  modal.hidden = false;
  modal.style.display = "grid";
  document.body.classList.add("review-modal-open");
  state.reviewModalOpen = true;
}

function closeReviewModal() {
  const modal = document.getElementById("reviewModal");
  const reviewMessageEl = document.getElementById("reviewModalMessage");
  const content = document.getElementById("reviewModalContent");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  modal.style.display = "none";
  document.body.classList.remove("review-modal-open");
  if (reviewMessageEl) {
    reviewMessageEl.textContent = "";
    reviewMessageEl.className = "form-message form-message--sheet";
  }
  if (content) {
    content.innerHTML = "";
  }
  state.reviewModalOpen = false;
}

function handleReviewModalClick(event) {
  if (event.target === event.currentTarget) {
    closeReviewModal();
  }
}

function handleReviewModalKeydown(event) {
  if (event.key === "Escape" && state.reviewModalOpen) {
    closeReviewModal();
  }
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
    if (section.id === "siblings") {
      const totalChildrenRaw = state.values.family_basic?.total_children;
      const totalChildren = Number.parseInt(totalChildrenRaw, 10);
      return Number.isNaN(totalChildren) || totalChildren > 1;
    }

    if (section.id === "children") {
      const childrenCountRaw = state.values.marital_basic?.children_count;
      const childrenCount = Number.parseInt(childrenCountRaw, 10);
      return !Number.isNaN(childrenCount) && childrenCount > 0;
    }

    return true;
  });
}
async function bootAdminPage() {
  document.getElementById("loginAdminBtn").addEventListener("click", loginAdmin);
  document.getElementById("refreshAdminBtn").addEventListener("click", loadAdminData);
  document.getElementById("logoutAdminBtn").addEventListener("click", logoutAdmin);
  document.getElementById("exportBtn").addEventListener("click", exportCsv);
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
  document.getElementById("adminSearchCitizenId").addEventListener("input", handleAdminCitizenIdSearch);
  document.getElementById("adminTableWrap").addEventListener("click", handleAdminTableActions);
  document.getElementById("adminTableWrap").addEventListener("click", handleAdminPaginationClick);
  document.getElementById("adminModalCloseBtn").addEventListener("click", closeAdminModal);
  document.getElementById("adminModal").addEventListener("click", handleAdminModalClick);
  document.addEventListener("keydown", handleAdminModalKeydown);

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
  closeAdminModal();
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
    messageEl.className = "form-message is-error";
    return;
  }

  messageEl.textContent = result.message;
  messageEl.className = "form-message is-success";
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
  document.getElementById("adminTrackingWrap").innerHTML = "";
  document.getElementById("adminSummaryCards").innerHTML = "";
  document.getElementById("adminSummaryLists").innerHTML = "";
  state.adminItems = [];
  state.adminInterestItems = [];
  state.adminCitizenIdFilter = "";
  state.adminPage = 1;
  state.adminTotalItems = 0;
  state.adminTotalPages = 1;
  closeAdminModal();
  showAdminLogin();
}

async function loadAdminData() {
  const messageEl = document.getElementById("adminMessage");
  messageEl.textContent = "Đang tải dữ liệu quản trị...";
  messageEl.className = "form-message";

  const params = new URLSearchParams({
    page: String(state.adminPage || 1),
    page_size: String(state.adminPageSize || 10),
  });
  if (state.adminCitizenIdFilter) {
    params.set("q", state.adminCitizenIdFilter);
  }

  const [summaryResponse, submissionsResponse, interestResponse] = await Promise.all([
    fetch("/api/admin/summary"),
    fetch(`/api/admin/submissions?${params.toString()}`),
    fetch("/api/admin/form-interest-logs"),
  ]);

  if (summaryResponse.status === 401 || submissionsResponse.status === 401 || interestResponse.status === 401) {
    showAdminLogin();
    messageEl.textContent = "";
    return;
  }

  const summary = await summaryResponse.json();
  const submissions = await submissionsResponse.json();
  const interestLogs = await interestResponse.json();
  state.adminItems = submissions.items || [];
  state.adminInterestItems = interestLogs.items || [];
  state.adminPage = submissions.page || 1;
  state.adminPageSize = submissions.page_size || 10;
  state.adminTotalItems = submissions.total_items || 0;
  state.adminTotalPages = submissions.total_pages || 1;

  document.getElementById("adminSummaryCards").innerHTML = renderSummaryCards(summary);
  document.getElementById("adminSummaryLists").innerHTML = renderSummaryLists(summary);
  renderAdminTableWrap();
  renderAdminTrackingWrap();

  messageEl.textContent = `Đã tải ${state.adminItems.length}/${state.adminTotalItems} phiếu ở trang ${state.adminPage}/${state.adminTotalPages} và ${state.adminInterestItems.length} lượt tracking.`;
  messageEl.className = "form-message is-success";
}

function handleAdminCitizenIdSearch(event) {
  state.adminCitizenIdFilter = event.target.value.trim();
  state.adminPage = 1;
  void loadAdminData();
}

function renderAdminTableWrap() {
  const tableWrap = document.getElementById("adminTableWrap");
  const messageEl = document.getElementById("adminMessage");
  const items = state.adminItems;
  tableWrap.innerHTML = renderAdminTable(items);

  if (!state.adminTotalItems) {
    return;
  }

  if (state.adminCitizenIdFilter) {
    messageEl.textContent = `Tìm thấy ${items.length}/${state.adminItems.length} phiếu theo từ khóa.`;
    messageEl.className = "form-message is-success";
    return;
  }

  messageEl.textContent = `Đang hiển thị ${items.length} phiếu đã gửi.`;
  messageEl.className = "form-message";
}

function renderAdminTrackingWrap() {
  document.getElementById("adminTrackingWrap").innerHTML = renderAdminTrackingTable(state.adminInterestItems);
}

function getFilteredAdminItems() {
  if (!state.adminCitizenIdFilter) {
    return state.adminItems;
  }
  const normalizedFilter = normalizeSearchText(state.adminCitizenIdFilter);
  return state.adminItems.filter((item) => getAdminSearchBlob(item).includes(normalizedFilter));
}

function handleAdminPaginationClick(event) {
  const paginationButton = event.target.closest("[data-admin-page]");
  if (!paginationButton) {
    return;
  }
  const nextPage = Number.parseInt(paginationButton.dataset.adminPage || "", 10);
  if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === state.adminPage) {
    return;
  }
  state.adminPage = nextPage;
  void loadAdminData();
}

function renderAdminPagination() {
  if ((state.adminTotalPages || 1) <= 1) {
    return "";
  }

  const prevDisabled = state.adminPage <= 1 ? "disabled" : "";
  const nextDisabled = state.adminPage >= state.adminTotalPages ? "disabled" : "";
  const startItem = state.adminTotalItems ? ((state.adminPage - 1) * state.adminPageSize) + 1 : 0;
  const endItem = Math.min(state.adminPage * state.adminPageSize, state.adminTotalItems);

  return `
    <div class="admin-pagination">
      <div class="admin-pagination__summary">
        Hiển thị ${startItem}-${endItem} / ${state.adminTotalItems} phiếu
      </div>
      <div class="admin-pagination__actions">
        <button type="button" class="ghost-btn admin-pagination__btn" data-admin-page="${state.adminPage - 1}" ${prevDisabled}>Trang trước</button>
        <span class="admin-pagination__page">Trang ${state.adminPage}/${state.adminTotalPages}</span>
        <button type="button" class="ghost-btn admin-pagination__btn" data-admin-page="${state.adminPage + 1}" ${nextDisabled}>Trang sau</button>
      </div>
    </div>
  `;
}

function renderAdminTableWrap() {
  const tableWrap = document.getElementById("adminTableWrap");
  const messageEl = document.getElementById("adminMessage");
  const items = state.adminItems;
  tableWrap.innerHTML = renderAdminTable(items);

  if (!state.adminTotalItems) {
    return;
  }

  if (state.adminCitizenIdFilter) {
    messageEl.textContent = `Tìm thấy ${state.adminTotalItems} phiếu theo từ khóa.`;
    messageEl.className = "form-message is-success";
    return;
  }

  messageEl.textContent = `Đang hiển thị ${items.length}/${state.adminTotalItems} phiếu ở trang ${state.adminPage}/${state.adminTotalPages}.`;
  messageEl.className = "form-message";
}

function getAdminSearchBlob(item) {
  if (!item._searchBlob) {
    item._searchBlob = normalizeSearchText(collectSearchTokens(item).join(" "));
  }
  return item._searchBlob;
}

function collectSearchTokens(value) {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectSearchTokens(entry));
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap((entry) => collectSearchTokens(entry));
  }
  return [String(value)];
}

function renderSummaryCards(summary) {
  const cards = [
    { label: "Tổng số phiếu", value: summary.total_submissions || 0 },
    { label: "Phiếu hôm nay", value: summary.today_submissions || 0 },
    { label: "CCCD duy nhất", value: summary.unique_citizen_ids || 0 },
    { label: "Lượt chọn phiếu phát triển", value: summary.total_interest_logs || 0 },
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
    { title: "Loại phiếu đã nộp", items: summary.submitted_forms || [] },
    { title: "Loại phiếu đang phát triển được chọn", items: summary.interest_forms || [] },
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
      <td class="admin-table__id">${item.id}</td>
      <td><span class="form-chip">${escapeHtml(item.form_label || item.form_code || "-")}</span></td>
      <td>${renderCitizenPrimaryInfo(item)}</td>
      <td>${renderCitizenLocationInfo(item)}</td>
      <td>${renderCitizenFamilyInfo(item)}</td>
      <td>${renderCitizenTimelineInfo(item)}</td>
      <td class="admin-table__date">${escapeHtml(formatDateTime(item.created_at))}</td>
      <td>${renderCitizenSummaryDetails(item)}</td>
      <td class="admin-table__actions">${renderCitizenActions(item)}</td>
    </tr>
  `).join("");

  return `
    <div class="admin-record-layout">
      <div class="admin-record-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Loại phiếu</th>
              <th>Thông tin công dân</th>
              <th>Địa bàn</th>
              <th>Gia đình</th>
              <th>Quá trình</th>
              <th>Thời gian tạo</th>
              <th>Tóm tắt</th>
              <th>Tác vụ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="admin-record-cards">
        ${items.map((item) => renderAdminSubmissionCard(item)).join("")}
      </div>
    </div>
  `;
}

function renderAdminTrackingTable(items) {
  if (!items.length) {
    return "<p>Chưa có lượt chọn phiếu đang phát triển.</p>";
  }

  const rows = items.map((item) => `
    <tr>
      <td class="admin-table__id">${item.id}</td>
      <td><span class="form-chip form-chip--pending">${escapeHtml(item.form_label || item.form_code || "-")}</span></td>
      <td>${escapeHtml(item.source || "landing")}</td>
      <td>${escapeHtml(item.client_ip || "-")}</td>
      <td class="admin-user-agent">${escapeHtml(item.user_agent || "-")}</td>
      <td class="admin-table__date">${escapeHtml(formatDateTime(item.created_at))}</td>
    </tr>
  `).join("");

  return `
    <div class="admin-record-layout">
      <div class="admin-record-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Loại phiếu</th>
              <th>Nguồn</th>
              <th>IP</th>
              <th>User agent</th>
              <th>Thời gian tạo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="admin-record-cards admin-record-cards--tracking">
        ${items.map((item) => renderAdminTrackingCard(item)).join("")}
      </div>
    </div>
  `;
}

function renderAdminTable(items) {
  if (!items.length) {
    return "<p>Chưa có phiếu nào phù hợp.</p>";
  }

  const rows = items.map((item) => `
    <tr>
      <td class="admin-table__id">${item.id}</td>
      <td><span class="form-chip">${escapeHtml(item.form_label || item.form_code || "-")}</span></td>
      <td>${renderCitizenPrimaryInfo(item)}</td>
      <td>${renderCitizenLocationInfo(item)}</td>
      <td>${renderCitizenFamilyInfo(item)}</td>
      <td>${renderCitizenTimelineInfo(item)}</td>
      <td class="admin-table__date">${escapeHtml(formatDateTime(item.created_at))}</td>
      <td>${renderCitizenSummaryDetails(item)}</td>
      <td class="admin-table__actions">${renderCitizenActions(item)}</td>
    </tr>
  `).join("");

  return `
    <div class="admin-record-layout">
      <div class="admin-record-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Loại phiếu</th>
              <th>Thông tin công dân</th>
              <th>Địa bàn</th>
              <th>Gia đình</th>
              <th>Quá trình</th>
              <th>Thời gian tạo</th>
              <th>Tóm tắt</th>
              <th>Tác vụ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="admin-record-cards">
        ${items.map((item) => renderAdminSubmissionCard(item)).join("")}
      </div>
      ${renderAdminPagination()}
    </div>
  `;
}

function renderAdminSubmissionCard(item) {
  return `
    <article class="admin-record-card">
      <div class="admin-record-card__head">
        <div class="admin-record-card__meta">
          <span class="admin-record-card__id">#${item.id}</span>
          <span class="form-chip">${escapeHtml(item.form_label || item.form_code || "-")}</span>
        </div>
        <time>${escapeHtml(formatDateTime(item.created_at))}</time>
      </div>
      <h4>${escapeHtml(item.full_name || "Công dân chưa rõ tên")}</h4>
      <div class="admin-record-card__sections">
        ${renderCompactBlock("Công dân", renderCitizenPrimaryInfo(item))}
        ${renderCompactBlock("Địa bàn", renderCitizenLocationInfo(item))}
        ${renderCompactBlock("Gia đình", renderCitizenFamilyInfo(item))}
        ${renderCompactBlock("Quá trình", renderCitizenTimelineInfo(item))}
        ${renderCompactBlock("Tóm tắt", renderCitizenSummaryDetails(item))}
      </div>
      <div class="admin-record-card__footer">
        ${renderCitizenActions(item)}
      </div>
    </article>
  `;
}

function renderAdminTrackingCard(item) {
  return `
    <article class="admin-record-card admin-record-card--tracking">
      <div class="admin-record-card__head">
        <div class="admin-record-card__meta">
          <span class="admin-record-card__id">#${item.id}</span>
          <span class="form-chip form-chip--pending">${escapeHtml(item.form_label || item.form_code || "-")}</span>
        </div>
        <time>${escapeHtml(formatDateTime(item.created_at))}</time>
      </div>
      <div class="admin-record-card__sections">
        ${renderCompactBlock("Nguồn", `<p>${escapeHtml(item.source || "landing")}</p>`)}
        ${renderCompactBlock("IP", `<p>${escapeHtml(item.client_ip || "-")}</p>`)}
        ${renderCompactBlock("User agent", `<p class="admin-user-agent">${escapeHtml(item.user_agent || "-")}</p>`)}
      </div>
    </article>
  `;
}

function renderCompactBlock(title, content) {
  return `
    <section class="admin-record-card__block">
      <h5>${escapeHtml(title)}</h5>
      ${content}
    </section>
  `;
}

function renderCitizenPrimaryInfo(item) {
  const personal = item.payload?.personal_basic || {};
  const pieces = [
    { label: "Họ tên", value: item.full_name },
    { label: "Khai sinh", value: personal.birth_name },
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
    { label: "Quê quán", value: item.hometown || personal.hometown },
    { label: "Thường trú gia đình", value: personal.family_permanent_residence },
    { label: "Nơi ở hiện tại", value: item.current_residence },
  ].filter((piece) => piece.value);
  return renderKeyValueList(pieces);
}

function renderCitizenFamilyInfo(item) {
  const family = item.payload?.family_basic || {};
  const marital = item.payload?.marital_basic || {};
  const pieces = [
    { label: "Cha", value: family.father_name },
    { label: "Mẹ", value: family.mother_name },
    { label: "Vợ/chồng", value: marital.spouse_name },
    { label: "Nhà có", value: family.total_children ? `${family.total_children} người con` : "" },
    { label: "Con thứ", value: family.birth_order },
    { label: "Con của bản thân", value: marital.children_count },
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
    { label: "Con", value: `${(item.payload?.children || []).length} người` },
  ];
  return renderKeyValueList(pieces);
}

function renderCitizenSummaryDetails(item) {
  const personal = item.payload?.personal_basic || {};
  const summaryPieces = [
    { label: "Dân tộc", value: personal.ethnicity },
    { label: "Tôn giáo", value: personal.religion },
    { label: "Quốc tịch", value: personal.nationality },
    { label: "Nghề nghiệp", value: personal.occupation },
    { label: "Nơi làm việc", value: personal.workplace },
    { label: "Trình độ", value: personal.training_level },
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

function renderCitizenActions(item) {
  return `
    <div class="admin-action-stack">
      <button type="button" class="ghost-btn admin-row-btn" data-admin-action="view" data-submission-id="${item.id}">
        Xem thông tin
      </button>
      <button type="button" class="primary-btn admin-row-btn" data-admin-action="profile" data-submission-id="${item.id}">
        Xuất hồ sơ
      </button>
    </div>
  `;
}

function handleAdminTableActions(event) {
  const button = event.target.closest("[data-admin-action]");
  if (!button) {
    return;
  }
  const submissionId = Number.parseInt(button.dataset.submissionId || "", 10);
  const item = state.adminItems.find((entry) => entry.id === submissionId);
  if (!item) {
    openAdminModal({
      eyebrow: "Không tìm thấy dữ liệu",
      title: "Không mở được hồ sơ",
      subtitle: `Không tìm thấy phiếu #${Number.isNaN(submissionId) ? "-" : submissionId} trong dữ liệu hiện tại.`,
      bodyHtml: renderModalErrorState("Hãy bấm “Làm mới” rồi thử lại một lần nữa."),
      wide: false,
      paper: false,
    });
    return;
  }
  try {
    if (button.dataset.adminAction === "view") {
      openSubmissionDetailModal(item);
      return;
    }
    if (button.dataset.adminAction === "profile") {
      openSubmissionProfileModal(item);
    }
  } catch (error) {
    console.error("admin-modal-render-error", error);
    openAdminModal({
      eyebrow: "Lỗi hiển thị",
      title: item.full_name || "Không thể mở hồ sơ",
      subtitle: "Đã có lỗi khi dựng popup. Mình hiển thị nội dung lỗi để tiếp tục xử lý nhanh.",
      bodyHtml: renderModalErrorState(error?.stack || error?.message || "Unknown error"),
      wide: true,
      paper: false,
      item,
    });
  }
}

function openSubmissionDetailModal(item) {
  state.currentAdminModalMode = "detail";
  state.currentAdminModalTab = "personal";
  openAdminModal({
    eyebrow: item.form_label || "Hồ sơ công dân",
    title: item.full_name || "Thông tin công dân",
    subtitle: `CCCD ${escapeHtml(item.citizen_id_number || "-")} · Tạo lúc ${escapeHtml(formatDateTime(item.created_at))}`,
    bodyHtml: renderAdminModalScaffold("detail"),
    wide: true,
    paper: false,
    item,
  });
  scheduleAdminModalRender();
}

function openSubmissionProfileModal(item) {
  state.currentAdminModalMode = "profile";
  state.currentAdminModalTab = "personal";
  const actionsHtml = `
    <button type="button" class="ghost-btn" data-modal-action="print-profile">In hồ sơ</button>
    <button type="button" class="ghost-btn" data-modal-action="export-pdf">Xuất PDF</button>
    <button type="button" class="primary-btn" data-modal-action="export-word">Xuất Word</button>
    <div class="admin-modal__hint">PDF sẽ dùng bản in chuẩn, có thể lưu bằng “Save as PDF”.</div>
  `;
  openAdminModal({
    eyebrow: "Biểu mẫu lý lịch",
    title: `Hồ sơ NVQS - ${item.full_name || "Công dân"}`,
    subtitle: "Xem trước hồ sơ để in hoặc xuất Word theo biểu mẫu quản trị.",
    bodyHtml: renderAdminModalScaffold("profile"),
    actionsHtml,
    wide: true,
    paper: true,
    item,
  });
  scheduleAdminModalRender();
}

function openAdminModal({ eyebrow = "", title = "", subtitle = "", bodyHtml = "", actionsHtml = "", wide = false, paper = false, item = null }) {
  const modal = document.getElementById("adminModal");
  const dialog = document.getElementById("adminModalDialog");
  document.getElementById("adminModalEyebrow").textContent = eyebrow || "";
  document.getElementById("adminModalTitle").textContent = title || "Chi tiết hồ sơ";
  document.getElementById("adminModalSubtitle").textContent = subtitle || "";
  document.getElementById("adminModalBody").innerHTML = bodyHtml || renderModalErrorState("Popup đã mở nhưng chưa nhận được nội dung hiển thị.");
  document.getElementById("adminModalActions").innerHTML = actionsHtml || "";
  dialog.classList.toggle("admin-modal__dialog--wide", wide);
  dialog.classList.toggle("admin-modal__dialog--paper", paper);
  modal.hidden = false;
  modal.style.display = "grid";
  document.body.classList.add("admin-modal-open");
  state.currentAdminModalItem = item;
}

function closeAdminModal() {
  const modal = document.getElementById("adminModal");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  modal.style.display = "none";
  document.body.classList.remove("admin-modal-open");
  state.currentAdminModalItem = null;
  state.currentAdminModalMode = "";
}

function handleAdminModalClick(event) {
  const overlay = event.target.closest("#adminModal");
  if (event.target === overlay) {
    closeAdminModal();
    return;
  }
  const tabButton = event.target.closest("[data-admin-tab]");
  if (tabButton) {
    state.currentAdminModalTab = tabButton.dataset.adminTab || "personal";
    setAdminModalTab(state.currentAdminModalTab);
    scheduleAdminModalRender();
    return;
  }
  const actionButton = event.target.closest("[data-modal-action]");
  if (!actionButton || !state.currentAdminModalItem) {
    return;
  }
  if (actionButton.dataset.modalAction === "export-word") {
    window.location.href = `/api/admin/submissions/${state.currentAdminModalItem.id}/profile.docx`;
    return;
  }
  if (actionButton.dataset.modalAction === "export-pdf") {
    printProfileDocument(state.currentAdminModalItem, "pdf");
    return;
  }
  if (actionButton.dataset.modalAction === "print-profile") {
    printProfileDocument(state.currentAdminModalItem, "print");
  }
}

function handleAdminModalKeydown(event) {
  if (event.key === "Escape") {
    closeAdminModal();
  }
}

function setAdminModalTab(tabName) {
  document.querySelectorAll(".admin-modal-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === tabName);
  });
}

function renderAdminModalScaffold(mode) {
  if (mode === "detail") {
    return `
      <div class="admin-modal-tabs">
        <button type="button" class="admin-modal-tab ${state.currentAdminModalTab === "personal" ? "is-active" : ""}" data-admin-tab="personal">Bản thân</button>
        <button type="button" class="admin-modal-tab ${state.currentAdminModalTab === "family" ? "is-active" : ""}" data-admin-tab="family">Gia đình</button>
      </div>
      <div id="adminModalPanelHost" class="admin-modal-panel-host">
        ${renderAdminModalLoading()}
      </div>
    `;
  }

  return `
    <div id="adminModalPanelHost" class="admin-modal-panel-host">
      ${renderAdminModalLoading("Đang dựng biểu mẫu lý lịch...")}
    </div>
  `;
}

function renderAdminModalLoading(text = "Đang tải nội dung hồ sơ...") {
  return `
    <div class="admin-modal-loading">
      <div class="admin-modal-loading__dot"></div>
      <span>${escapeHtml(text)}</span>
    </div>
  `;
}

function scheduleAdminModalRender() {
  const host = document.getElementById("adminModalPanelHost");
  if (!host || !state.currentAdminModalItem) {
    return;
  }
  host.innerHTML = renderAdminModalLoading(
    state.currentAdminModalMode === "profile"
      ? "Đang dựng biểu mẫu lý lịch..."
      : "Đang tải chi tiết hồ sơ..."
  );
  window.setTimeout(() => {
    try {
      renderAdminModalContent();
    } catch (error) {
      console.error("admin-modal-content-error", error);
      const currentHost = document.getElementById("adminModalPanelHost");
      if (currentHost) {
        currentHost.innerHTML = renderModalErrorState(error?.stack || error?.message || "Unknown error");
      }
    }
  }, 16);
}

function renderAdminModalContent() {
  const host = document.getElementById("adminModalPanelHost");
  const item = state.currentAdminModalItem;
  if (!host || !item) {
    return;
  }

  if (state.currentAdminModalMode === "profile") {
    host.innerHTML = `
      <div class="profile-preview-shell">
        <article class="profile-sheet" id="adminProfileSheet">
          ${buildProfileDocumentMarkup(item)}
        </article>
      </div>
    `;
    return;
  }

  if (state.currentAdminModalMode === "detail") {
    setAdminModalTab(state.currentAdminModalTab);
    host.innerHTML = state.currentAdminModalTab === "family"
      ? renderDetailPanelFamily(item)
      : renderDetailPanelPersonal(item);
  }
}

function renderDetailPanelPersonal(item) {
  const personal = item.payload?.personal_basic || {};
  return `
    <div class="detail-grid">
      ${renderDetailCard("Định danh", renderDefinitionGrid([
        ["Họ tên", item.full_name],
        ["Họ tên khai sinh", personal.birth_name],
        ["Ngày sinh", personal.date_of_birth],
        ["Giới tính", personal.gender],
        ["CCCD", item.citizen_id_number],
        ["Điện thoại", item.phone],
        ["Nơi đăng ký khai sinh", personal.birth_registration_place],
        ["Quê quán", personal.hometown],
      ]))}
      ${renderDetailCard("Nơi cư trú", renderDefinitionGrid([
        ["Địa chỉ", personal.street_address],
        ["Khu phố", personal.neighborhood],
        ["Phường", personal.ward],
        ["Tỉnh/Thành phố", personal.province],
        ["Thường trú gia đình", personal.family_permanent_residence],
        ["Nơi ở hiện tại", personal.current_residence],
      ]))}
      ${renderDetailCard("Học tập và nghề nghiệp", renderDefinitionGrid([
        ["Thành phần gia đình", personal.family_background],
        ["Thành phần bản thân", personal.personal_background],
        ["Trình độ văn hóa", personal.education_level],
        ["Năm tốt nghiệp", personal.graduation_year],
        ["Trình độ đào tạo", personal.training_level],
        ["Chuyên ngành", personal.major],
        ["Ngoại ngữ", personal.foreign_language],
        ["Nghề nghiệp", personal.occupation],
        ["Nơi làm việc", personal.workplace],
        ["Lương ngạch", personal.salary_grade],
        ["Bậc lương", personal.salary_step],
      ]))}
      ${renderDetailCard("Đoàn thể và ghi chú", renderDefinitionGrid([
        ["Ngày vào Đoàn", personal.youth_union_join_date],
        ["Ngày vào Đảng", personal.party_join_date],
        ["Ngày chính thức vào Đảng", personal.party_official_date],
        ["Dân tộc", personal.ethnicity],
        ["Tôn giáo", personal.religion],
        ["Quốc tịch", personal.nationality],
      ]) + renderLongTextList([
        ["Khen thưởng", personal.reward_record],
        ["Kỷ luật", personal.discipline_record],
      ]))}
      ${renderDetailCard("Lý lịch bản thân", renderTimelineList(item.payload?.personal_history || [], "giai đoạn"))}
    </div>
  `;
}

function renderDetailPanelFamily(item) {
  const family = item.payload?.family_basic || {};
  const marital = item.payload?.marital_basic || {};
  return `
    <div class="detail-grid">
      ${renderDetailCard("Cha", renderDefinitionGrid([
        ["Họ tên", family.father_name],
        ["Ngày sinh", family.father_date_of_birth],
        ["Điện thoại", family.father_phone],
        ["Nghề nghiệp", family.father_occupation],
        ["Tình trạng", family.father_status],
        ["Nơi ở hiện tại", family.father_current_residence],
      ]) + renderTimelineList(item.payload?.father_history || [], "giai đoạn"))}
      ${renderDetailCard("Mẹ", renderDefinitionGrid([
        ["Họ tên", family.mother_name],
        ["Ngày sinh", family.mother_date_of_birth],
        ["Điện thoại", family.mother_phone],
        ["Nghề nghiệp", family.mother_occupation],
        ["Tình trạng", family.mother_status],
        ["Nơi ở hiện tại", family.mother_current_residence],
      ]) + renderTimelineList(item.payload?.mother_history || [], "giai đoạn"))}
      ${renderDetailCard("Hôn nhân", renderDefinitionGrid([
        ["Tình trạng hôn nhân", marital.marital_status],
        ["Vợ/chồng", marital.spouse_name],
        ["Ngày sinh vợ/chồng", marital.spouse_date_of_birth],
        ["Nghề nghiệp vợ/chồng", marital.spouse_occupation],
        ["Nơi ở hiện tại", marital.spouse_current_residence],
        ["Số con", marital.children_count],
      ]) + renderLongTextList([
        ["Ghi chú vợ/chồng", marital.spouse_notes],
        ["Ghi chú gia đình", family.family_notes],
      ]))}
      ${renderDetailCard("Cấu trúc gia đình", renderDefinitionGrid([
        ["Số người con của cha mẹ", family.total_children],
        ["Bản thân là con thứ", family.birth_order],
        ["Số con trai", family.sons_count],
        ["Số con gái", family.daughters_count],
      ]))}
      ${renderDetailCard("Anh chị em", renderPeopleList(item.payload?.siblings || [], "Chưa khai anh chị em."))}
      ${renderDetailCard("Con của công dân", renderPeopleList(item.payload?.children || [], "Chưa khai thông tin con."))}
    </div>
  `;
}

function buildProfileDocumentMarkup(item) {
  const personal = item.payload?.personal_basic || {};
  const family = item.payload?.family_basic || {};
  const marital = item.payload?.marital_basic || {};
  const siblings = item.payload?.siblings || [];
  const children = item.payload?.children || [];
  const fatherHistory = item.payload?.father_history || [];
  const motherHistory = item.payload?.mother_history || [];
  const personalHistory = item.payload?.personal_history || [];
  return `
    <section class="profile-page">
      ${renderProfileHeader()}
      <div class="profile-template-meta">
        <span>Biểu số 09/GNN-2025</span>
        <span>Khổ biểu 29,7 x 42 cm</span>
      </div>
      <h3 class="profile-title">LÝ LỊCH NGHĨA VỤ QUÂN SỰ</h3>
      <h4>I. SƠ YẾU LÝ LỊCH</h4>
      <div class="profile-form-grid">
        ${renderProfileLine("Họ, chữ đệm và tên khai sinh (viết chữ in hoa)", upperCase(item.full_name))}
        ${renderProfileLine("Họ, chữ đệm và tên thường dùng", item.full_name)}
        ${renderProfileDoubleLine("Sinh ngày", personal.date_of_birth, "Giới tính", personal.gender)}
        ${renderProfileLine("Số thẻ căn cước/CCCD", item.citizen_id_number)}
        ${renderProfileLine("Nơi đăng ký khai sinh", personal.birth_registration_place)}
        ${renderProfileLine("Quê quán", personal.hometown)}
        ${renderProfileTripleLine("Dân tộc", personal.ethnicity, "Tôn giáo", personal.religion, "Quốc tịch", personal.nationality)}
        ${renderProfileLine("Nơi thường trú của gia đình", personal.family_permanent_residence)}
        ${renderProfileLine("Nơi ở hiện tại của bản thân", personal.current_residence || personal.street_address)}
        ${renderProfileDoubleLine("Thành phần gia đình", personal.family_background, "Bản thân", personal.personal_background)}
        ${renderProfileLine("Trình độ giáo dục phổ thông", personal.education_level)}
        ${renderProfileDoubleLine("Trình độ đào tạo", personal.training_level, "Ngoại ngữ", personal.foreign_language)}
        ${renderProfileLine("Chuyên ngành đào tạo", personal.major)}
        ${renderProfileDoubleLine("Ngày vào Đảng CSVN", personal.party_join_date, "Chính thức", personal.party_official_date)}
        ${renderProfileLine("Ngày vào Đoàn TNCS Hồ Chí Minh", personal.youth_union_join_date)}
        ${renderProfileDoubleLine("Khen thưởng", personal.reward_record, "Kỷ luật", personal.discipline_record)}
        ${renderProfileTripleLine("Nghề nghiệp", personal.occupation, "Lương ngạch", personal.salary_grade, "Bậc", personal.salary_step)}
        ${renderProfileLine("Nơi làm việc (học tập)", personal.workplace)}
        ${renderProfileLine("Đã đi nước ngoài (tên nước, thời gian, lý do)", personal.abroad_history)}
        ${renderProfileDoubleLine("Họ tên cha", family.father_name, "Tình trạng", family.father_status)}
        ${renderProfileDoubleLine("Sinh năm cha", extractYear(family.father_date_of_birth), "Nghề nghiệp cha", family.father_occupation)}
        ${renderProfileDoubleLine("Họ tên mẹ", family.mother_name, "Tình trạng", family.mother_status)}
        ${renderProfileDoubleLine("Sinh năm mẹ", extractYear(family.mother_date_of_birth), "Nghề nghiệp mẹ", family.mother_occupation)}
        ${renderProfileDoubleLine("Họ tên vợ/chồng", marital.spouse_name, "Sinh năm", extractYear(marital.spouse_date_of_birth))}
        ${renderProfileDoubleLine("Nghề nghiệp vợ/chồng", marital.spouse_occupation, "Bản thân đã có", marital.children_count ? `${marital.children_count} con` : "")}
        ${renderProfileLine("Cha mẹ có", family.total_children ? `${family.total_children} người con, ${displayValue(family.sons_count)} trai, ${displayValue(family.daughters_count)} gái. Bản thân là con thứ ${displayValue(family.birth_order)}.` : "")}
      </div>
      ${renderPageNumber(1)}
    </section>
    <section class="profile-page">
      <h4>II. TÌNH HÌNH KINH TẾ, CHÍNH TRỊ CỦA GIA ĐÌNH</h4>
      <p class="profile-sheet__hint">(Của cha đẻ, mẹ đẻ hoặc người trực tiếp nuôi dưỡng của bản thân và của vợ hoặc chồng; anh chị em ruột; con đẻ, con nuôi theo quy định của pháp luật; nghề nghiệp, tình hình kinh tế, chính trị của từng người qua các thời kỳ).</p>
      ${renderRuledParagraphs(buildFamilyNarratives(item), 28)}
      ${renderPageNumber(2)}
    </section>
    <section class="profile-page profile-page--stacked">
      <h4>III. TÌNH HÌNH KINH TẾ, CHÍNH TRỊ, QUÁ TRÌNH CÔNG TÁC CỦA BẢN THÂN</h4>
      <p class="profile-sheet__hint">(Nêu thời gian, kết quả học tập, rèn luyện phấn đấu từ nhỏ đến thời điểm nhập ngũ)</p>
      ${renderRuledParagraphs(buildSelfNarratives(item), 7)}
      <div class="profile-signature profile-signature--right">
        <strong>NGƯỜI KHAI</strong>
        <span>(Ký ghi rõ họ tên)</span>
        <b>${escapeHtml(upperCase(item.full_name))}</b>
      </div>
      <h4>IV. NHẬN XÉT VÀ KẾT LUẬN CỦA CÔNG AN CẤP XÃ</h4>
      <p class="profile-sheet__hint">(Nhận xét, kết luận về tiêu chuẩn chính trị đối với bản thân và tình hình chính trị của gia đình đến thời điểm nhập ngũ)</p>
      ${renderRuledParagraphs([], 7)}
      <div class="profile-signature profile-signature--right profile-signature--compact">
        <span>Ngày.........tháng....... năm 20……</span>
        <strong>TRƯỞNG CÔNG AN</strong>
      </div>
      ${renderPageNumber(3)}
    </section>
    <section class="profile-page profile-page--stacked">
      <h4>V. KẾT LUẬN CỦA BAN CHỈ HUY QUÂN SỰ CẤP XÃ (HOẶC CƠ QUAN, TỔ CHỨC)</h4>
      ${renderRuledParagraphs([], 10)}
      <div class="profile-signature profile-signature--right profile-signature--compact">
        <span>Ngày......... tháng.......năm 20........</span>
        <strong>CHỈ HUY TRƯỞNG</strong>
      </div>
      <h4>VI. KẾT LUẬN CỦA HỘI ĐỒNG NVQS CẤP XÃ TRƯỚC KHI CÔNG DÂN NHẬP NGŨ</h4>
      ${renderRuledParagraphs([], 10)}
      <div class="profile-signature profile-signature--right profile-signature--compact">
        <span>Ngày......... tháng....... năm 20.....</span>
        <strong>TM. HỘI ĐỒNG NGHĨA VỤ QUÂN SỰ</strong>
      </div>
      ${renderPageNumber(4)}
    </section>
  `;
}

function buildProfileBookletMarkup(item) {
  const template = document.createElement("template");
  template.innerHTML = buildProfileDocumentMarkup(item).trim();
  const pages = Array.from(template.content.querySelectorAll(".profile-page"));
  const spreads = [
    [3, 0],
    [1, 2],
  ];
  return spreads
    .map((spread) => `
      <div class="profile-spread">
        ${spread.map((pageIndex) => pages[pageIndex]?.outerHTML || "").join("")}
      </div>
    `)
    .join("");
}

function buildFamilyNarratives(item) {
  const family = item.payload?.family_basic || {};
  const marital = item.payload?.marital_basic || {};
  const siblings = item.payload?.siblings || [];
  const children = item.payload?.children || [];
  const narratives = [
    `Cha: ${displayValue(family.father_name)}, sinh năm ${displayValue(extractYear(family.father_date_of_birth))}, nghề nghiệp ${displayValue(family.father_occupation)}, tình trạng ${displayValue(family.father_status)}, nơi ở hiện tại ${displayValue(family.father_current_residence)}.`,
    `Mẹ: ${displayValue(family.mother_name)}, sinh năm ${displayValue(extractYear(family.mother_date_of_birth))}, nghề nghiệp ${displayValue(family.mother_occupation)}, tình trạng ${displayValue(family.mother_status)}, nơi ở hiện tại ${displayValue(family.mother_current_residence)}.`,
  ];
  if ((item.payload?.father_history || []).length) {
    narratives.push(`Quá trình của cha: ${joinHistory(item.payload?.father_history || [])}.`);
  }
  if ((item.payload?.mother_history || []).length) {
    narratives.push(`Quá trình của mẹ: ${joinHistory(item.payload?.mother_history || [])}.`);
  }
  if (marital.spouse_name) {
    narratives.push(`Vợ/chồng: ${displayValue(marital.spouse_name)}, sinh năm ${displayValue(extractYear(marital.spouse_date_of_birth))}, nghề nghiệp ${displayValue(marital.spouse_occupation)}, nơi ở hiện tại ${displayValue(marital.spouse_current_residence)}. ${displayValue(marital.spouse_notes)}`);
  }
  siblings.forEach((sibling, index) => {
    narratives.push(`${formatSiblingPrefix(sibling, index)}, sinh năm ${displayValue(extractYear(sibling.date_of_birth))}, nghề nghiệp ${displayValue(sibling.occupation)}, nơi học tập/làm việc ${displayValue(sibling.workplace)}, nơi ở hiện tại ${displayValue(sibling.current_residence)}. ${displayValue(sibling.notes)}`);
  });
  children.forEach((child, index) => {
    narratives.push(`Con ${index + 1}: ${displayValue(child.full_name)}, sinh năm ${displayValue(extractYear(child.date_of_birth))}, học tập/nghề nghiệp ${displayValue(child.occupation)}, nơi ở hiện tại ${displayValue(child.current_residence)}. ${displayValue(child.notes)}`);
  });
  if (family.family_notes) {
    narratives.push(`Ghi chú thêm về tình hình gia đình: ${displayValue(family.family_notes)}.`);
  }
  return narratives;
}

function formatSiblingPrefix(sibling, index) {
  const relation = String(sibling.relation || "").trim();
  const fullName = displayValue(sibling.full_name);
  if (relation) {
    return `${relation} ${fullName}`;
  }
  return `Anh/chị/em ${index + 1}: ${fullName}`;
}

function buildSelfNarratives(item) {
  const personal = item.payload?.personal_basic || {};
  const personalHistory = item.payload?.personal_history || [];
  const narratives = personalHistory.length
    ? personalHistory.map((entry, index) => `${index + 1}. ${displayValue(entry.stage_name)}: ${displayValue(entry.from_year)} - ${displayValue(entry.to_year)}. ${displayValue(entry.summary)}.`)
    : ["Chưa có thông tin lý lịch bản thân."];
  if (personal.reward_record) {
    narratives.push(`Khen thưởng: ${displayValue(personal.reward_record)}.`);
  }
  if (personal.discipline_record) {
    narratives.push(`Kỷ luật: ${displayValue(personal.discipline_record)}.`);
  }
  return narratives;
}

function printProfileDocument(item, mode = "print") {
  const printWindow = window.open("", "_blank", "width=1500,height=980");
  if (!printWindow) {
    return;
  }
  const content = buildProfileBookletMarkup(item);
  const helperText = mode === "pdf"
    ? '<div class="profile-export-hint">Trong hộp thoại in, chọn đích “Save as PDF” để lưu thành file PDF.</div>'
    : "";
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Hồ sơ NVQS</title>
        <style>
          @page { size: A3 landscape; margin: 0; }
          body { margin: 0; padding: 16px; background: #f7f1ed; font-family: "Times New Roman", serif; color: #18110d; }
          .profile-sheet { width: 420mm; margin: 0 auto; display: block; }
          .profile-spread { width: 420mm; min-height: 297mm; box-sizing: border-box; margin: 0 auto 16px; padding: 18mm 9.4mm 15mm 18mm; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 12.7mm; background: #fffefc; box-shadow: 0 16px 42px rgba(65, 30, 18, 0.12); break-after: page; page-break-after: always; }
          .profile-spread:last-child { break-after: auto; page-break-after: auto; margin-bottom: 0; }
          .profile-page { position: relative; width: auto; height: 264mm; min-height: 0; box-sizing: border-box; padding: 0; background: #fffefc; overflow: hidden; }
          .profile-sheet__header { text-align: center; }
          .profile-sheet__header p { margin: 0; font-size: 15px; font-weight: 700; }
          .profile-template-meta { display: grid; justify-items: end; gap: 2px; margin-top: 8px; color: #2c1711; font-size: 13px; }
          .profile-title { margin: 18px 0 16px; text-align: center; font-size: 25px; letter-spacing: 0.08em; }
          .profile-page h4 { margin: 0 0 10px; font-size: 17px; }
          .profile-page h5 { margin: 12px 0 6px; font-size: 15px; }
          .profile-page p { line-height: 1.45; margin: 0 0 10px; }
          .profile-sheet__hint, .profile-empty { font-style: italic; }
          .profile-line { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 10px; align-items: baseline; min-height: 22px; padding: 3px 0; line-height: 1.25; font-size: 13px; }
          .profile-line--wide-label { grid-template-columns: 330px minmax(0, 1fr); }
          .profile-line--double { grid-template-columns: 145px minmax(0, 1fr) 105px minmax(0, 1fr); gap: 8px; }
          .profile-line--triple { grid-template-columns: 80px minmax(0, 1fr) 72px minmax(0, 1fr) 70px minmax(0, 1fr); gap: 8px; }
          .profile-label { font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: clip; }
          .profile-value { font-weight: 700; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: clip; }
          .profile-table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 13px; line-height: 1.35; }
          .profile-table th, .profile-table td { border: 1px solid rgba(56, 17, 13, 0.55); padding: 6px 7px; vertical-align: top; }
          .profile-table th { text-align: center; font-weight: 700; background: #fbf0ea; }
          .profile-ruled-lines { display: grid; gap: 0; }
          .profile-ruled-lines p { min-height: 23px; margin: 0; border-bottom: 1px dotted rgba(56, 17, 13, 0.55); line-height: 1.45; }
          .profile-signature { display: grid; gap: 6px; margin-top: 26px; text-align: center; }
          .profile-page--stacked h4 { margin-top: 8px; }
          .profile-page--stacked h4:first-child { margin-top: 0; }
          .profile-page--stacked .profile-ruled-lines p { min-height: 20px; }
          .profile-page--stacked .profile-signature { margin-top: 12px; }
          .profile-page--stacked .profile-signature b { margin-top: 34px; }
          .profile-signature--right { width: 48%; margin-left: auto; }
          .profile-signature--compact { margin-top: 14px; }
          .profile-signature b { margin-top: 56px; }
          .profile-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; margin: 42px 0 46px; text-align: center; min-height: 160px; }
          .profile-signature-grid div { display: grid; align-content: start; gap: 8px; }
          .profile-signature-grid b { margin-top: 82px; }
          .profile-note-lines { display: grid; gap: 14px; margin-top: 18px; }
          .profile-note-lines span { border-bottom: 1px dotted rgba(56, 17, 13, 0.5); min-height: 18px; }
          .profile-page-number { position: absolute; right: 15mm; bottom: 8mm; color: #76564c; font-size: 12px; }
          .profile-export-hint { max-width: 420mm; margin: 0 auto 16px; padding: 14px 16px; border-radius: 14px; background: #fff3d9; color: #5f3c00; font-family: Georgia, serif; }
          @media print {
            body { background: #fff; padding: 0; }
            .profile-export-hint { display: none; }
            .profile-sheet { width: 420mm; margin: 0; display: block; }
            .profile-spread { width: 420mm; height: 297mm; min-height: 297mm; margin: 0; box-shadow: none; }
            .profile-page { width: auto; height: 264mm; min-height: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        ${helperText}
        <article class="profile-sheet">${content}</article>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function renderDetailCard(title, content) {
  return `
    <section class="detail-card">
      <div class="detail-card__header">
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="detail-card__body">${content}</div>
    </section>
  `;
}

function renderModalErrorState(message) {
  return `
    <div class="admin-modal-error">
      <strong>Chưa hiển thị được dữ liệu hồ sơ.</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderDefinitionGrid(items) {
  const visibleItems = items.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!visibleItems.length) {
    return "<p class=\"admin-empty\">Chưa có dữ liệu.</p>";
  }
  return `
    <dl class="detail-definition-grid">
      ${visibleItems.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function renderLongTextList(items) {
  const visibleItems = items.filter(([, value]) => value);
  if (!visibleItems.length) {
    return "";
  }
  return `
    <div class="detail-longtext-list">
      ${visibleItems.map(([label, value]) => `
        <article>
          <strong>${escapeHtml(label)}</strong>
          <p>${escapeHtml(value)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderTimelineList(items, unitLabel) {
  if (!items.length) {
    return `<p class="admin-empty">Chưa có ${escapeHtml(unitLabel)}.</p>`;
  }
  return `
    <ol class="detail-timeline">
      ${items.map((item) => `
        <li>
          <strong>${escapeHtml(item.stage_name || `${item.from_year} - ${item.to_year}`)}</strong>
          <span>${escapeHtml(`${item.from_year || "-"} - ${item.to_year || "-"}`)}</span>
          <p>${escapeHtml(item.summary || "")}</p>
        </li>
      `).join("")}
    </ol>
  `;
}

function renderPeopleList(items, emptyText) {
  if (!items.length) {
    return `<p class="admin-empty">${escapeHtml(emptyText)}</p>`;
  }
  return `
    <div class="people-card-list">
      ${items.map((item, index) => `
        <article class="people-card">
          <h4>${escapeHtml(item.full_name || `Mục ${index + 1}`)}</h4>
          ${renderDefinitionGrid([
            ["Quan hệ", item.relation],
            ["Ngày sinh", item.date_of_birth],
            ["Nghề nghiệp", item.occupation],
            ["Nơi học tập/làm việc", item.workplace],
            ["Nơi ở hiện tại", item.current_residence],
          ])}
          ${renderLongTextList([["Ghi chú", item.notes]])}
        </article>
      `).join("")}
    </div>
  `;
}

function renderNarrativeParagraphs(lines) {
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function renderRuledParagraphs(lines, minLines) {
  const visibleLines = lines.filter((line) => String(line || "").trim() !== "");
  const total = Math.max(minLines, visibleLines.length);
  return `
    <div class="profile-ruled-lines">
      ${Array.from({ length: total }, (_, index) => `
        <p>${escapeHtml(visibleLines[index] || "")}</p>
      `).join("")}
    </div>
  `;
}

function renderProfileHeader() {
  return `
    <header class="profile-sheet__header">
      <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
      <p>Độc lập - Tự do - Hạnh phúc</p>
    </header>
  `;
}

function renderPageNumber(pageNumber) {
  return `<div class="profile-page-number">Trang ${pageNumber}/4</div>`;
}

function buildParentNarrative(label, name, dateOfBirth, occupation, status, residence) {
  return `${label}: ${displayValue(name)}, sinh năm ${displayValue(extractYear(dateOfBirth))}, nghề nghiệp ${displayValue(occupation)}, tình trạng ${displayValue(status)}, nơi ở hiện tại ${displayValue(residence)}.`;
}

function renderProfileHistoryTable(items, emptyTitle, includeStage = false) {
  const records = Array.isArray(items) ? items : [];
  if (!records.length) {
    return `<p class="profile-empty">${escapeHtml(emptyTitle)}: Chưa có dữ liệu.</p>`;
  }
  return `
    <table class="profile-table">
      <thead>
        <tr>
          <th>Từ năm</th>
          <th>Đến năm</th>
          ${includeStage ? "<th>Giai đoạn</th>" : ""}
          <th>Nội dung</th>
        </tr>
      </thead>
      <tbody>
        ${records.map((record) => `
          <tr>
            <td>${escapeHtml(displayValue(record.from_year))}</td>
            <td>${escapeHtml(displayValue(record.to_year))}</td>
            ${includeStage ? `<td>${escapeHtml(displayValue(record.stage_name))}</td>` : ""}
            <td>${escapeHtml(displayValue(record.summary))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderProfilePeopleTable(items, emptyTitle) {
  const records = Array.isArray(items) ? items : [];
  if (!records.length) {
    return `<p class="profile-empty">${escapeHtml(emptyTitle)}: Chưa có dữ liệu.</p>`;
  }
  return `
    <table class="profile-table profile-table--people">
      <thead>
        <tr>
          <th>STT</th>
          <th>Họ tên</th>
          <th>Quan hệ</th>
          <th>Năm sinh</th>
          <th>Nghề nghiệp / nơi học tập</th>
          <th>Nơi ở hiện tại</th>
        </tr>
      </thead>
      <tbody>
        ${records.map((record, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(displayValue(record.full_name))}</td>
            <td>${escapeHtml(displayValue(record.relation))}</td>
            <td>${escapeHtml(displayValue(extractYear(record.date_of_birth)))}</td>
            <td>${escapeHtml(displayValue(record.occupation || record.workplace))}</td>
            <td>${escapeHtml(displayValue(record.current_residence))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderProfileLine(label, value) {
  const className = label.length > 34 ? "profile-line profile-line--wide-label" : "profile-line";
  return `<div class="${className}"><span class="profile-label">${escapeHtml(label)}</span><span class="profile-value">${escapeHtml(displayValue(value))}</span></div>`;
}

function renderProfileDoubleLine(labelA, valueA, labelB, valueB) {
  return `
    <div class="profile-line profile-line--double">
      <span class="profile-label">${escapeHtml(labelA)}</span><span class="profile-value">${escapeHtml(displayValue(valueA))}</span>
      <span class="profile-label">${escapeHtml(labelB)}</span><span class="profile-value">${escapeHtml(displayValue(valueB))}</span>
    </div>
  `;
}

function renderProfileTripleLine(labelA, valueA, labelB, valueB, labelC, valueC) {
  return `
    <div class="profile-line profile-line--triple">
      <span class="profile-label">${escapeHtml(labelA)}</span><span class="profile-value">${escapeHtml(displayValue(valueA))}</span>
      <span class="profile-label">${escapeHtml(labelB)}</span><span class="profile-value">${escapeHtml(displayValue(valueB))}</span>
      <span class="profile-label">${escapeHtml(labelC)}</span><span class="profile-value">${escapeHtml(displayValue(valueC))}</span>
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

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function displayValue(value) {
  const text = String(value || "").trim();
  return text || "................................";
}

function upperCase(value) {
  return String(value || "").trim().toUpperCase();
}

function extractYear(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.includes("/")) {
    return raw.split("/").pop();
  }
  if (raw.includes("-")) {
    const parts = raw.split("-");
    if (parts[0].length === 4) {
      return parts[0];
    }
    return parts.pop();
  }
  return raw;
}

function joinHistory(items) {
  return items.map((item) => `${displayValue(item.from_year)}-${displayValue(item.to_year)}: ${displayValue(item.summary)}`).join("; ");
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

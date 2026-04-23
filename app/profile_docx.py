from __future__ import annotations

import io
from typing import Any

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt


def generate_profile_docx(submission: dict[str, Any]) -> bytes:
    payload = _payload(submission)
    personal = payload.get("personal_basic", {})
    family = payload.get("family_basic", {})
    marital = payload.get("marital_basic", {})

    document = Document()
    _setup_section(document.sections[0])
    _setup_styles(document)

    _render_page_1(document, submission, personal, family, marital)
    _page_break(document)
    _render_page_2(document, payload, family, marital)
    _page_break(document)
    _render_page_3(document, payload, personal)
    _page_break(document)
    _render_page_4(document, submission, personal)

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def _render_page_1(
    document: Document,
    submission: dict[str, Any],
    personal: dict[str, Any],
    family: dict[str, Any],
    marital: dict[str, Any],
) -> None:
    _national_header(document)
    _center(document, "LÝ LỊCH NGHĨA VỤ QUÂN SỰ", bold=True, size=18, before=8, after=8)
    _section_title(document, "I. SƠ YẾU LÝ LỊCH")
    _form_table(
        document,
        [
            ("Họ, chữ đệm và tên thường dùng", _upper(submission.get("full_name"))),
            ("Họ, chữ đệm và tên khai sinh", personal.get("birth_name") or submission.get("full_name")),
            ("Sinh ngày", personal.get("date_of_birth"), "Giới tính", personal.get("gender")),
            ("Số thẻ Căn cước công dân", submission.get("citizen_id_number")),
            ("Nơi đăng ký khai sinh", personal.get("birth_registration_place")),
            ("Quê quán", personal.get("hometown")),
            ("Dân tộc", personal.get("ethnicity"), "Tôn giáo", personal.get("religion")),
            ("Quốc tịch", personal.get("nationality"), "Điện thoại", submission.get("phone")),
            ("Nơi thường trú của gia đình", personal.get("family_permanent_residence")),
            ("Nơi ở hiện tại của bản thân", personal.get("current_residence") or personal.get("street_address")),
            ("Thành phần gia đình", personal.get("family_background"), "Bản thân", personal.get("personal_background")),
            ("Trình độ văn hóa", personal.get("education_level"), "Năm tốt nghiệp", personal.get("graduation_year")),
            ("Ngành, nghề đào tạo", personal.get("major"), "Trình độ đào tạo", personal.get("training_level")),
            ("Trình độ ngoại ngữ", personal.get("foreign_language")),
            ("Ngày vào Đảng CSVN", personal.get("party_join_date"), "Chính thức", personal.get("party_official_date")),
            ("Ngày vào Đoàn TNCS Hồ Chí Minh", personal.get("youth_union_join_date")),
            ("Khen thưởng", personal.get("reward_record"), "Kỷ luật", personal.get("discipline_record")),
            ("Nghề nghiệp", personal.get("occupation"), "Nơi làm việc/học tập", personal.get("workplace")),
            ("Lương ngạch", personal.get("salary_grade"), "Bậc", personal.get("salary_step")),
            ("Họ tên cha", family.get("father_name"), "Tình trạng", family.get("father_status")),
            ("Sinh năm cha", _extract_year(family.get("father_date_of_birth")), "Nghề nghiệp cha", family.get("father_occupation")),
            ("Họ tên mẹ", family.get("mother_name"), "Tình trạng", family.get("mother_status")),
            ("Sinh năm mẹ", _extract_year(family.get("mother_date_of_birth")), "Nghề nghiệp mẹ", family.get("mother_occupation")),
            ("Họ tên vợ/chồng", marital.get("spouse_name"), "Sinh năm", _extract_year(marital.get("spouse_date_of_birth"))),
            ("Nghề nghiệp vợ/chồng", marital.get("spouse_occupation"), "Bản thân đã có", _children_count(marital)),
            ("Cha mẹ có", _family_children_summary(family)),
        ],
    )


def _render_page_2(document: Document, payload: dict[str, Any], family: dict[str, Any], marital: dict[str, Any]) -> None:
    _section_title(document, "II. TÌNH HÌNH KINH TẾ, CHÍNH TRỊ CỦA GIA ĐÌNH")
    _sub_title(document, "1. Cha")
    _paragraph(document, _person_sentence(family, "father"))
    _history_block(document, payload.get("father_history", []), "Quá trình của cha")

    _sub_title(document, "2. Mẹ")
    _paragraph(document, _person_sentence(family, "mother"))
    _history_block(document, payload.get("mother_history", []), "Quá trình của mẹ")

    _sub_title(document, "3. Vợ/chồng và con")
    if marital.get("spouse_name"):
        _paragraph(
            document,
            "Vợ/chồng: {name}; sinh năm {year}; nghề nghiệp {occupation}; nơi ở hiện tại {residence}. {notes}".format(
                name=_value(marital.get("spouse_name")),
                year=_value(_extract_year(marital.get("spouse_date_of_birth"))),
                occupation=_value(marital.get("spouse_occupation")),
                residence=_value(marital.get("spouse_current_residence")),
                notes=_value(marital.get("spouse_notes"), empty=""),
            ),
        )
    else:
        _paragraph(document, "Chưa khai thông tin vợ/chồng.")
    _people_table(document, payload.get("children", []), "Thông tin con")

    _sub_title(document, "4. Anh, chị, em ruột")
    _people_table(document, payload.get("siblings", []), "Thông tin anh, chị, em")


def _render_page_3(document: Document, payload: dict[str, Any], personal: dict[str, Any]) -> None:
    _section_title(document, "III. TÌNH HÌNH KINH TẾ, CHÍNH TRỊ, QUÁ TRÌNH CÔNG TÁC CỦA BẢN THÂN")
    _paragraph(
        document,
        "(Nêu thời gian, kết quả học tập, rèn luyện phấn đấu từ nhỏ đến thời điểm nhập ngũ.)",
        italic=True,
    )
    histories = payload.get("personal_history", [])
    if histories:
        table = document.add_table(rows=1, cols=4)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.style = "Table Grid"
        _set_header_cells(table.rows[0].cells, ["Từ năm", "Đến năm", "Giai đoạn", "Nội dung"])
        for item in histories:
            cells = table.add_row().cells
            values = [
                _value(item.get("from_year")),
                _value(item.get("to_year")),
                _value(item.get("stage_name")),
                _value(item.get("summary")),
            ]
            for cell, value in zip(cells, values):
                _cell_text(cell, value)
    else:
        _paragraph(document, "Chưa có thông tin quá trình bản thân.")

    _sub_title(document, "Khen thưởng, kỷ luật và ghi chú")
    _form_table(
        document,
        [
            ("Khen thưởng", personal.get("reward_record")),
            ("Kỷ luật", personal.get("discipline_record")),
            ("Ghi chú", personal.get("notes")),
        ],
    )


def _render_page_4(document: Document, submission: dict[str, Any], personal: dict[str, Any]) -> None:
    _section_title(document, "IV. CAM ĐOAN VÀ XÁC NHẬN")
    _paragraph(
        document,
        "Tôi xin cam đoan những lời khai trên là đúng sự thật. Nếu có điều gì khai sai, tôi xin hoàn toàn chịu trách nhiệm trước pháp luật.",
    )
    _paragraph(document, "")
    sign_table = document.add_table(rows=1, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for cell in sign_table.rows[0].cells:
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
    _signature_cell(
        sign_table.rows[0].cells[0],
        [
            "XÁC NHẬN CỦA ĐỊA PHƯƠNG",
            "(Ký, ghi rõ họ tên và đóng dấu)",
            "",
            "",
            "",
        ],
    )
    _signature_cell(
        sign_table.rows[0].cells[1],
        [
            "NGƯỜI KHAI",
            "(Ký, ghi rõ họ tên)",
            "",
            "",
            _upper(submission.get("full_name") or personal.get("full_name")),
        ],
    )
    _paragraph(document, "")
    _section_title(document, "GHI CHÚ CỦA BAN CHỈ HUY QUÂN SỰ")
    _blank_lines(document, 9)


def _form_table(document: Document, rows: list[tuple[Any, ...]]) -> None:
    table = document.add_table(rows=0, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    for row in rows:
        cells = table.add_row().cells
        if len(row) == 2:
            cells[0].merge(cells[1])
            cells[2].merge(cells[3])
            _cell_text(cells[0], str(row[0]), bold=True)
            _cell_text(cells[2], _value(row[1]))
        else:
            _cell_text(cells[0], str(row[0]), bold=True)
            _cell_text(cells[1], _value(row[1]))
            _cell_text(cells[2], str(row[2]), bold=True)
            _cell_text(cells[3], _value(row[3]))


def _people_table(document: Document, people: Any, title: str) -> None:
    people = people if isinstance(people, list) else []
    if not people:
        _paragraph(document, f"{title}: Chưa có dữ liệu.")
        return
    table = document.add_table(rows=1, cols=6)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    _set_header_cells(table.rows[0].cells, ["STT", "Họ tên", "Quan hệ", "Năm sinh", "Nghề nghiệp", "Nơi ở hiện tại"])
    for index, person in enumerate(people, start=1):
        cells = table.add_row().cells
        values = [
            str(index),
            _value(person.get("full_name")),
            _value(person.get("relation")),
            _value(_extract_year(person.get("date_of_birth"))),
            _value(person.get("occupation") or person.get("workplace")),
            _value(person.get("current_residence")),
        ]
        for cell, value in zip(cells, values):
            _cell_text(cell, value)


def _history_block(document: Document, items: Any, title: str) -> None:
    items = items if isinstance(items, list) else []
    if not items:
        _paragraph(document, f"{title}: Chưa có dữ liệu.")
        return
    table = document.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    _set_header_cells(table.rows[0].cells, ["Từ năm", "Đến năm", "Nội dung"])
    for item in items:
        cells = table.add_row().cells
        values = [_value(item.get("from_year")), _value(item.get("to_year")), _value(item.get("summary"))]
        for cell, value in zip(cells, values):
            _cell_text(cell, value)


def _setup_section(section: Any) -> None:
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.6)
    section.bottom_margin = Cm(1.4)
    section.left_margin = Cm(1.5)
    section.right_margin = Cm(1.5)


def _setup_styles(document: Document) -> None:
    style = document.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(11)


def _national_header(document: Document) -> None:
    _center(document, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold=True, size=12)
    _center(document, "Độc lập - Tự do - Hạnh phúc", bold=True, size=12)


def _section_title(document: Document, text: str) -> None:
    _paragraph(document, text, bold=True, size=12, before=4, after=4)


def _sub_title(document: Document, text: str) -> None:
    _paragraph(document, text, bold=True, size=11, before=4, after=2)


def _center(document: Document, text: str, *, bold: bool = False, size: int = 11, before: int = 0, after: int = 0) -> None:
    paragraph = _paragraph(document, text, bold=bold, size=size, before=before, after=after)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER


def _paragraph(
    document: Document,
    text: str,
    *,
    bold: bool = False,
    italic: bool = False,
    size: int = 11,
    before: int = 0,
    after: int = 2,
) -> Any:
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = 1.05
    run = paragraph.add_run(str(text or ""))
    run.bold = bold
    run.italic = italic
    run.font.name = "Times New Roman"
    run.font.size = Pt(size)
    return paragraph


def _cell_text(cell: Any, text: str, *, bold: bool = False) -> None:
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(0)
    run = paragraph.add_run(str(text or ""))
    run.bold = bold
    run.font.name = "Times New Roman"
    run.font.size = Pt(10)


def _set_header_cells(cells: Any, labels: list[str]) -> None:
    for cell, label in zip(cells, labels):
        _cell_text(cell, label, bold=True)


def _signature_cell(cell: Any, lines: list[str]) -> None:
    for index, line in enumerate(lines):
        paragraph = cell.paragraphs[0] if index == 0 else cell.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run(line)
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run.bold = index in {0, len(lines) - 1}


def _blank_lines(document: Document, count: int) -> None:
    for _ in range(count):
        _paragraph(document, "........................................................................................................................")


def _page_break(document: Document) -> None:
    document.add_page_break()


def _payload(submission: dict[str, Any]) -> dict[str, Any]:
    payload = submission.get("payload", {})
    return payload if isinstance(payload, dict) else {}


def _person_sentence(family: dict[str, Any], prefix: str) -> str:
    label = "Cha" if prefix == "father" else "Mẹ"
    return "{label}: {name}; sinh năm {year}; nghề nghiệp {occupation}; tình trạng {status}; nơi ở hiện tại {residence}.".format(
        label=label,
        name=_value(family.get(f"{prefix}_name")),
        year=_value(_extract_year(family.get(f"{prefix}_date_of_birth"))),
        occupation=_value(family.get(f"{prefix}_occupation")),
        status=_value(family.get(f"{prefix}_status")),
        residence=_value(family.get(f"{prefix}_current_residence")),
    )


def _children_count(marital: dict[str, Any]) -> str:
    count = str(marital.get("children_count") or "").strip()
    return f"{count} con" if count else ""


def _family_children_summary(family: dict[str, Any]) -> str:
    total = family.get("total_children")
    if not total:
        return ""
    return "{total} người con, {sons} trai, {daughters} gái. Bản thân là con thứ {order}.".format(
        total=_value(total),
        sons=_value(family.get("sons_count")),
        daughters=_value(family.get("daughters_count")),
        order=_value(family.get("birth_order")),
    )


def _extract_year(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    for separator in ("/", "-"):
        if separator in text:
            parts = text.split(separator)
            if len(parts) == 3:
                return parts[0] if len(parts[0]) == 4 else parts[-1]
    return text


def _upper(value: Any) -> str:
    return _value(value, empty="").upper()


def _value(value: Any, *, empty: str = "................................") -> str:
    text = str(value or "").strip()
    return text if text else empty

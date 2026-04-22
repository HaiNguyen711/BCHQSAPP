from __future__ import annotations

import io
import zipfile
from typing import Any
from xml.sax.saxutils import escape


def generate_profile_docx(submission: dict[str, Any]) -> bytes:
    payload = submission.get("payload", {})
    personal = payload.get("personal_basic", {})
    family = payload.get("family_basic", {})
    marital = payload.get("marital_basic", {})
    siblings = payload.get("siblings", []) if isinstance(payload.get("siblings"), list) else []
    children = payload.get("children", []) if isinstance(payload.get("children"), list) else []
    personal_history = payload.get("personal_history", []) if isinstance(payload.get("personal_history"), list) else []
    father_history = payload.get("father_history", []) if isinstance(payload.get("father_history"), list) else []
    mother_history = payload.get("mother_history", []) if isinstance(payload.get("mother_history"), list) else []

    paragraphs: list[str] = [
        _paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", align="center", bold=True, size=28),
        _paragraph("Độc lập - Tự do - Hạnh phúc", align="center", bold=True, size=28),
        _spacer(),
        _paragraph("LÝ LỊCH", align="center", bold=True, size=30),
        _paragraph("NGHĨA VỤ QUÂN SỰ", align="center", bold=True, size=30),
        _spacer(),
        _paragraph("I. SƠ YẾU LÝ LỊCH", bold=True, size=26),
        _paragraph(f"Họ, chữ đệm và tên thường dùng (viết chữ in hoa): {_upper(personal.get('full_name'))}"),
        _paragraph(f"Họ, chữ đệm và tên khai sinh: {_value(personal.get('birth_name') or personal.get('full_name'))}"),
        _paragraph(
            "Sinh ngày: {date}    Giới tính: {gender}".format(
                date=_value(personal.get("date_of_birth")),
                gender=_value(personal.get("gender")),
            )
        ),
        _paragraph(f"Số CMND hoặc số thẻ Căn cước công dân: {_value(personal.get('citizen_id_number'))}"),
        _paragraph(f"Nơi đăng ký khai sinh: {_value(personal.get('birth_registration_place'))}"),
        _paragraph(f"Quê quán: {_value(personal.get('hometown'))}"),
        _paragraph(
            "Dân tộc: {ethnicity}    Tôn giáo: {religion}    Quốc tịch: {nationality}".format(
                ethnicity=_value(personal.get("ethnicity")),
                religion=_value(personal.get("religion")),
                nationality=_value(personal.get("nationality")),
            )
        ),
        _paragraph(f"Nơi thường trú của gia đình: {_value(personal.get('family_permanent_residence'))}"),
        _paragraph(f"Nơi ở hiện tại của bản thân: {_value(personal.get('current_residence'))}"),
        _paragraph(
            "Thành phần gia đình: {family_background}    Bản thân: {personal_background}".format(
                family_background=_value(personal.get("family_background")),
                personal_background=_value(personal.get("personal_background")),
            )
        ),
        _paragraph(
            "Trình độ văn hóa: {education_level}    Năm tốt nghiệp: {graduation_year}".format(
                education_level=_value(personal.get("education_level")),
                graduation_year=_value(personal.get("graduation_year")),
            )
        ),
        _paragraph(
            "Ngành, nghề đào tạo: {major}    Trình độ đào tạo: {training_level}".format(
                major=_value(personal.get("major")),
                training_level=_value(personal.get("training_level")),
            )
        ),
        _paragraph(f"Trình độ ngoại ngữ: {_value(personal.get('foreign_language'))}"),
        _paragraph(
            "Ngày vào Đảng CSVN: {party_join}    Chính thức: {party_official}".format(
                party_join=_value(personal.get("party_join_date")),
                party_official=_value(personal.get("party_official_date")),
            )
        ),
        _paragraph(f"Ngày vào Đoàn TNCS Hồ Chí Minh: {_value(personal.get('youth_union_join_date'))}"),
        _paragraph(
            "Khen thưởng: {reward}    Kỷ luật: {discipline}".format(
                reward=_value(personal.get("reward_record")),
                discipline=_value(personal.get("discipline_record")),
            )
        ),
        _paragraph(
            "Nghề nghiệp: {occupation}    Lương ngạch: {salary_grade}    Bậc: {salary_step}".format(
                occupation=_value(personal.get("occupation")),
                salary_grade=_value(personal.get("salary_grade")),
                salary_step=_value(personal.get("salary_step")),
            )
        ),
        _paragraph(f"Nơi làm việc (học tập): {_value(personal.get('workplace'))}"),
        _paragraph(
            "Họ tên cha: {name}    Tình trạng: {status}".format(
                name=_value(family.get("father_name")),
                status=_value(family.get("father_status")),
            )
        ),
        _paragraph(
            "Sinh năm: {year}    Nghề nghiệp: {occupation}".format(
                year=_value(_extract_year(family.get("father_date_of_birth"))),
                occupation=_value(family.get("father_occupation")),
            )
        ),
        _paragraph(
            "Họ tên mẹ: {name}    Tình trạng: {status}".format(
                name=_value(family.get("mother_name")),
                status=_value(family.get("mother_status")),
            )
        ),
        _paragraph(
            "Sinh năm: {year}    Nghề nghiệp: {occupation}".format(
                year=_value(_extract_year(family.get("mother_date_of_birth"))),
                occupation=_value(family.get("mother_occupation")),
            )
        ),
        _paragraph(
            "Họ tên vợ (chồng): {name}    Sinh năm: {year}".format(
                name=_value(marital.get("spouse_name")),
                year=_value(_extract_year(marital.get("spouse_date_of_birth"))),
            )
        ),
        _paragraph(
            "Nghề nghiệp: {occupation}    Bản thân đã có: {children_count} con".format(
                occupation=_value(marital.get("spouse_occupation")),
                children_count=_value(marital.get("children_count")),
            )
        ),
        _paragraph(
            "Cha mẹ có: {total_children} người con, {sons} trai, {daughters} gái. Bản thân là con thứ: {birth_order}".format(
                total_children=_value(family.get("total_children")),
                sons=_value(family.get("sons_count")),
                daughters=_value(family.get("daughters_count")),
                birth_order=_value(family.get("birth_order")),
            )
        ),
        _spacer(),
        _paragraph("II. TÌNH HÌNH KINH TẾ, CHÍNH TRỊ CỦA GIA ĐÌNH", bold=True, size=26),
    ]

    family_lines = _build_family_lines(family, marital, siblings, children, father_history, mother_history)
    for line in family_lines:
        paragraphs.append(_paragraph(line))

    paragraphs.extend(
        [
            _spacer(),
            _paragraph(
                "III. TÌNH HÌNH KINH TẾ, CHÍNH TRỊ, QUÁ TRÌNH CÔNG TÁC CỦA BẢN THÂN",
                bold=True,
                size=26,
            ),
            _paragraph("(Nêu thời gian, kết quả học tập, rèn luyện phấn đấu từ nhỏ đến thời điểm nhập ngũ)", italic=True),
        ]
    )

    if personal_history:
        for index, item in enumerate(personal_history, start=1):
            paragraphs.append(
                _paragraph(
                    "{index}. {stage}: {from_year} - {to_year}. {summary}".format(
                        index=index,
                        stage=_value(item.get("stage_name")),
                        from_year=_value(item.get("from_year")),
                        to_year=_value(item.get("to_year")),
                        summary=_value(item.get("summary")),
                    )
                )
            )
    else:
        paragraphs.append(_paragraph("Chưa có thông tin lý lịch bản thân."))

    if personal.get("reward_record"):
        paragraphs.append(_paragraph(f"Khen thưởng: {_value(personal.get('reward_record'))}"))
    if personal.get("discipline_record"):
        paragraphs.append(_paragraph(f"Kỷ luật: {_value(personal.get('discipline_record'))}"))

    paragraphs.extend(
        [
            _spacer(),
            _spacer(),
            _paragraph("CHỮ KÝ CỦA CÔNG DÂN", align="center", bold=True, size=26),
            _paragraph("(Ký, ghi rõ họ tên)", align="center", italic=True),
            _spacer(),
            _paragraph(_upper(personal.get("full_name")), align="center", bold=True),
        ]
    )

    document_xml = _build_document_xml(paragraphs)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _content_types_xml())
        archive.writestr("_rels/.rels", _root_rels_xml())
        archive.writestr("word/document.xml", document_xml)
    return buffer.getvalue()


def _build_family_lines(
    family: dict[str, Any],
    marital: dict[str, Any],
    siblings: list[dict[str, Any]],
    children: list[dict[str, Any]],
    father_history: list[dict[str, Any]],
    mother_history: list[dict[str, Any]],
) -> list[str]:
    lines = [
        "Cha: {name}; sinh năm {year}; nghề nghiệp {occupation}; tình trạng {status}; nơi ở hiện tại {residence}.".format(
            name=_value(family.get("father_name")),
            year=_value(_extract_year(family.get("father_date_of_birth"))),
            occupation=_value(family.get("father_occupation")),
            status=_value(family.get("father_status")),
            residence=_value(family.get("father_current_residence")),
        ),
        "Mẹ: {name}; sinh năm {year}; nghề nghiệp {occupation}; tình trạng {status}; nơi ở hiện tại {residence}.".format(
            name=_value(family.get("mother_name")),
            year=_value(_extract_year(family.get("mother_date_of_birth"))),
            occupation=_value(family.get("mother_occupation")),
            status=_value(family.get("mother_status")),
            residence=_value(family.get("mother_current_residence")),
        ),
    ]

    if father_history:
        lines.append(f"Quá trình của cha: {_join_history(father_history)}")
    if mother_history:
        lines.append(f"Quá trình của mẹ: {_join_history(mother_history)}")

    if marital.get("spouse_name"):
        lines.append(
            "Vợ/chồng: {name}; sinh năm {year}; nghề nghiệp {occupation}; nơi ở hiện tại {residence}; ghi chú {notes}.".format(
                name=_value(marital.get("spouse_name")),
                year=_value(_extract_year(marital.get("spouse_date_of_birth"))),
                occupation=_value(marital.get("spouse_occupation")),
                residence=_value(marital.get("spouse_current_residence")),
                notes=_value(marital.get("spouse_notes")),
            )
        )

    if siblings:
        for index, sibling in enumerate(siblings, start=1):
            lines.append(
                "Anh/chị/em {index}: {name}; quan hệ {relation}; sinh năm {year}; nghề nghiệp {occupation}; nơi học tập/làm việc {workplace}; nơi ở hiện tại {residence}; ghi chú {notes}.".format(
                    index=index,
                    name=_value(sibling.get("full_name")),
                    relation=_value(sibling.get("relation")),
                    year=_value(_extract_year(sibling.get("date_of_birth"))),
                    occupation=_value(sibling.get("occupation")),
                    workplace=_value(sibling.get("workplace")),
                    residence=_value(sibling.get("current_residence")),
                    notes=_value(sibling.get("notes")),
                )
            )

    if children:
        for index, child in enumerate(children, start=1):
            lines.append(
                "Con {index}: {name}; sinh năm {year}; tình trạng học tập/nghề nghiệp {occupation}; nơi ở hiện tại {residence}; ghi chú {notes}.".format(
                    index=index,
                    name=_value(child.get("full_name")),
                    year=_value(_extract_year(child.get("date_of_birth"))),
                    occupation=_value(child.get("occupation")),
                    residence=_value(child.get("current_residence")),
                    notes=_value(child.get("notes")),
                )
            )

    if family.get("family_notes"):
        lines.append(f"Ghi chú thêm về tình hình gia đình: {_value(family.get('family_notes'))}")

    return lines


def _join_history(items: list[dict[str, Any]]) -> str:
    parts = []
    for item in items:
        parts.append(
            "{from_year}-{to_year}: {summary}".format(
                from_year=_value(item.get("from_year")),
                to_year=_value(item.get("to_year")),
                summary=_value(item.get("summary")),
            )
        )
    return "; ".join(parts) if parts else "Chưa có thông tin."


def _build_document_xml(paragraphs: list[str]) -> str:
    body = "".join(paragraphs)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        f"{body}"
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
        "</w:body></w:document>"
    )


def _paragraph(
    text: str,
    *,
    align: str = "left",
    bold: bool = False,
    italic: bool = False,
    size: int = 24,
) -> str:
    alignment = {
        "left": "left",
        "center": "center",
        "right": "right",
        "both": "both",
    }.get(align, "left")
    text = escape(text)
    run_props = [
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
        f'<w:sz w:val="{size}"/>',
        f'<w:szCs w:val="{size}"/>',
        '<w:lang w:val="vi-VN"/>',
    ]
    if bold:
        run_props.append("<w:b/><w:bCs/>")
    if italic:
        run_props.append("<w:i/><w:iCs/>")
    return (
        "<w:p>"
        f'<w:pPr><w:jc w:val="{alignment}"/></w:pPr>'
        f"<w:r><w:rPr>{''.join(run_props)}</w:rPr><w:t xml:space=\"preserve\">{text}</w:t></w:r>"
        "</w:p>"
    )


def _spacer() -> str:
    return _paragraph(" ", size=20)


def _content_types_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )


def _root_rels_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        "</Relationships>"
    )


def _extract_year(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if "/" in text:
        parts = text.split("/")
        if len(parts) == 3:
            return parts[-1]
    if "-" in text:
        parts = text.split("-")
        if len(parts) == 3:
            if len(parts[0]) == 4:
                return parts[0]
            return parts[-1]
    return text


def _upper(value: Any) -> str:
    return _value(value).upper()


def _value(value: Any) -> str:
    text = str(value or "").strip()
    return text if text else "................................"

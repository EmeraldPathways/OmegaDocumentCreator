from __future__ import annotations

from html import escape
from html.parser import HTMLParser

ALLOWED_TAGS = {
    "article",
    "aside",
    "blockquote",
    "br",
    "div",
    "em",
    "footer",
    "header",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "img",
    "li",
    "ol",
    "p",
    "section",
    "span",
    "strong",
    "ul",
}

BLOCKED_TAGS = {"iframe", "object", "script", "style", "svg", "template"}
VOID_TAGS = {"br", "img"}
ALLOWED_ATTRIBUTES = {"alt", "class", "height", "src", "style", "title", "width"}
ALLOWED_IMAGE_PROTOCOLS = ("data:", "blob:", "http:", "https:")


class _PreviewHtmlSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._blocked_depth = 0
        self._allowed_stack: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_name = tag.lower()
        if tag_name in BLOCKED_TAGS:
            self._blocked_depth += 1
            return

        if self._blocked_depth > 0 or tag_name not in ALLOWED_TAGS:
            return

        rendered_attrs: list[str] = []
        for attribute_name, raw_value in attrs:
            name = attribute_name.lower()
            if name.startswith("on") or name not in ALLOWED_ATTRIBUTES:
                continue

            value = raw_value or ""
            if name == "src" and not value.lower().startswith(ALLOWED_IMAGE_PROTOCOLS):
                continue

            rendered_attrs.append(f' {name}="{escape(value, quote=True)}"')

        if tag_name == "img" and not any(attr.startswith(' src="') for attr in rendered_attrs):
            return

        self._parts.append(f"<{tag_name}{''.join(rendered_attrs)}>")
        if tag_name not in VOID_TAGS:
            self._allowed_stack.append(tag_name)

    def handle_endtag(self, tag: str) -> None:
        tag_name = tag.lower()
        if tag_name in BLOCKED_TAGS:
            if self._blocked_depth > 0:
                self._blocked_depth -= 1
            return

        if self._blocked_depth > 0 or tag_name not in ALLOWED_TAGS or tag_name in VOID_TAGS:
            return

        if tag_name in self._allowed_stack:
            while self._allowed_stack:
                open_tag = self._allowed_stack.pop()
                self._parts.append(f"</{open_tag}>")
                if open_tag == tag_name:
                    break

    def handle_data(self, data: str) -> None:
        if self._blocked_depth == 0:
            self._parts.append(escape(data))

    def get_html(self) -> str:
        while self._allowed_stack:
            self._parts.append(f"</{self._allowed_stack.pop()}>")
        return "".join(self._parts)


def sanitize_preview_html(html: str | None) -> str:
    if not html:
        return ""

    sanitizer = _PreviewHtmlSanitizer()
    sanitizer.feed(html)
    sanitizer.close()
    return sanitizer.get_html()

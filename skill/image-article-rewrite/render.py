#!/usr/bin/env python3
"""
render.py - 根据 layout JSON 生成 HTML 并用 Playwright 截图
用法：python render.py '<pages_json_string>'
"""

import sys
import json
import os
import tempfile
import html as html_module
from pathlib import Path


def build_html(rewritten_text: str, layout: dict) -> str:
    """根据 layout 参数和改写文字生成 HTML 字符串"""
    bg = layout.get("background_color", "#ffffff")
    font_size = layout.get("font_size", "18px")
    line_height = layout.get("line_height", "1.8")
    padding = layout.get("padding", "40px 50px")
    font_color = layout.get("font_color", "#333333")
    width = layout.get("width", "750px")
    font_family = layout.get("font_family", "PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif")
    text_align = layout.get("text_align", "left")
    title_font_size = layout.get("title_font_size", "")
    title_font_color = layout.get("title_font_color", font_color)
    title_font_weight = layout.get("title_font_weight", "bold")

    paragraphs = [p.strip() for p in rewritten_text.split("\n\n") if p.strip()]
    html_paragraphs = []

    for i, para in enumerate(paragraphs):
        escaped = html_module.escape(para).replace("\n", "<br/>")
        if i == 0 and title_font_size:
            html_paragraphs.append(f'<p class="title">{escaped}</p>')
        else:
            html_paragraphs.append(f"<p>{escaped}</p>")

    body_html = "\n".join(html_paragraphs)

    title_style = ""
    if title_font_size:
        title_style = f"""
        .container .title {{
            font-size: {title_font_size};
            color: {title_font_color};
            font-weight: {title_font_weight};
            margin-bottom: 0.6em;
        }}
        """

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    background: {bg};
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }}
  .container {{
    background: {bg};
    width: {width};
    padding: {padding};
    font-family: {font_family};
    font-size: {font_size};
    line-height: {line_height};
    color: {font_color};
    text-align: {text_align};
  }}
  .container p {{
    margin-bottom: 1em;
  }}
  .container p:last-child {{
    margin-bottom: 0;
  }}
  {title_style}
</style>
</head>
<body>
<div class="container">
{body_html}
</div>
</body>
</html>"""


def render_pages(pages: list, output_dir: str = "."):
    """生成 HTML 文件并用 Playwright 截图"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[ERROR] Playwright 未安装，请运行：pip install playwright && playwright install chromium")
        sys.exit(1)

    output_paths = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(device_scale_factor=2)

        for i, page_data in enumerate(pages):
            rewritten_text = page_data.get("rewritten_text") or page_data.get("text", "")
            layout = page_data.get("layout", {})

            html_content = build_html(rewritten_text, layout)

            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".html", encoding="utf-8", delete=False
            ) as f:
                f.write(html_content)
                tmp_path = f.name

            try:
                tab = context.new_page()
                tab.goto(f"file://{tmp_path}")
                tab.wait_for_load_state("networkidle")

                container = tab.query_selector(".container")
                if container is None:
                    print(f"[WARN] 第 {i+1} 张：未找到 .container 元素，截全页")
                    output_path = os.path.join(output_dir, f"output_{i+1}.png")
                    tab.screenshot(path=output_path, full_page=True)
                else:
                    output_path = os.path.join(output_dir, f"output_{i+1}.png")
                    container.screenshot(path=output_path)

                output_paths.append(output_path)
                print(f"[OK] 第 {i+1} 张已输出：{output_path}")
                tab.close()
            finally:
                os.unlink(tmp_path)

        browser.close()

    return output_paths


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python render.py '<pages_json>'")
        sys.exit(1)

    pages_json = sys.argv[1]
    try:
        pages = json.loads(pages_json)
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON 解析失败：{e}")
        sys.exit(1)

    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    os.makedirs(output_dir, exist_ok=True)

    render_pages(pages, output_dir)
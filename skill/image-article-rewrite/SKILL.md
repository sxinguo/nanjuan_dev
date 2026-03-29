---
name: image-article-rewrite
description: 接收用户上传的多张图片（内容为排版好的文章页面），自动完成：① Claude 视觉识别文字+排版参数 → ② 轻度改写文本 → ③ 还原排版并用 Playwright 渲染成图片输出。输出图片数量与输入一致。当用户提到「图片改写」「文章图片复刻」「洗稿图片」「图转图」时，使用此技能。
---

# image-article-rewrite 技能

## 功能概述

接收一张或多张「排版好的文章图片」，输出视觉风格高度还原、文字已轻度改写的新图片。全程无需第三方 OCR 库，使用 Claude 视觉能力完成识别，使用 Playwright 完成渲染截图。

---

## 工作流步骤

### Step 1：视觉分析（OCR + 排版识别，一步完成）

对每张用户上传的图片，使用 Claude 视觉能力同时完成文字提取和排版参数识别。

**Prompt 模板**（对每张图片单独调用）：

```
请仔细分析这张图片，它是一张排版好的文章页面。请完成以下两件事并以 JSON 格式输出：

1. 提取图片中所有可见文字（text 字段），保留原有段落结构，段落之间用 \n\n 分隔
2. 识别排版参数（layout 字段），包括：
   - background_color：背景颜色（十六进制）
   - font_size：正文字号（如 "18px"）
   - line_height：行高（如 "1.8"）
   - padding：内边距（如 "40px 50px"）
   - font_color：文字颜色（十六进制）
   - width：内容区宽度（如 "750px"）
   - font_family：字体（如 "PingFang SC, sans-serif"，默认用此值）
   - text_align：对齐方式（如 "left" 或 "justify"）
   - title_font_size：标题字号（若有标题）
   - title_font_color：标题颜色（若有）
   - title_font_weight：标题粗细（若有）

输出格式严格为：
{
  "text": "识别出的原文内容",
  "layout": {
    "background_color": "#ffffff",
    "font_size": "18px",
    "line_height": "1.8",
    "padding": "40px 50px",
    "font_color": "#333333",
    "width": "750px",
    "font_family": "PingFang SC, sans-serif",
    "text_align": "left",
    "title_font_size": "22px",
    "title_font_color": "#111111",
    "title_font_weight": "bold"
  }
}

只输出 JSON，不要加任何解释文字。
```

**输出**：每张图片对应一个 JSON 对象，存入列表 `pages[]`。

---

### Step 2：轻度改写文本

对每个 `pages[i].text`，使用以下规则进行改写，幅度控制在 20%~35%：

- 同义词替换（如「重要」→「关键」、「发现」→「注意到」）
- 句式微调（主动句/被动句互换、语序轻微调整）
- 删除冗余词、填补省略的连接词
- **不改变原意、不增删核心信息点、不改变段落结构**
- 保留所有标点和段落分隔（`\n\n`）

**Prompt 模板**：

```
请对以下文字进行轻度改写。要求：
- 保持原意不变，段落结构不变
- 改写幅度约 20%~35%，以同义替换和句式微调为主
- 不要增加或删除核心信息
- 直接输出改写后的文字，不要任何解释

原文：
{text}
```

将改写结果存入 `pages[i].rewritten_text`。

---

### Step 3：渲染成图片

调用下方 Python 脚本，传入 `pages[]` 数组（含 `rewritten_text` 和 `layout`），脚本将：

1. 为每张图片生成对应 HTML 文件
2. 用 Playwright 截取 `.container` 元素
3. 输出 `output_1.png`、`output_2.png`……

---

## Python 渲染脚本

保存为 `render.py`，在 skill 执行时由 Claude 动态生成并调用。

```python
#!/usr/bin/env python3
"""
render.py - 根据 layout JSON 生成 HTML 并用 Playwright 截图
用法：python render.py '<pages_json_string>'
pages_json 格式：
[
  {
    "rewritten_text": "改写后的文字",
    "layout": { ... }
  },
  ...
]
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

    # 将段落文字转换为 HTML，首段识别为标题（若有 title_font_size）
    paragraphs = [p.strip() for p in rewritten_text.split("\n\n") if p.strip()]
    html_paragraphs = []

    for i, para in enumerate(paragraphs):
        escaped = html_module.escape(para).replace("\n", "<br/>")
        if i == 0 and title_font_size:
            html_paragraphs.append(
                f'<p class="title">{escaped}</p>'
            )
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
        context = browser.new_context(device_scale_factor=2)  # 2x 高清截图

        for i, page_data in enumerate(pages):
            rewritten_text = page_data.get("rewritten_text") or page_data.get("text", "")
            layout = page_data.get("layout", {})

            html_content = build_html(rewritten_text, layout)

            # 写入临时 HTML 文件
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
```

---

## 执行流程（Claude 操作步骤）

```
1. 接收用户上传的图片列表，记录图片总数 N

2. 对每张图片 i（i=1..N）：
   a. 调用 Claude 视觉分析 → 得到 pages[i-1] = { text, layout }
   b. 调用 Claude 文本改写 → 得到 pages[i-1].rewritten_text

3. 将 pages[] 序列化为 JSON 字符串

4. 生成 render.py 到临时目录（或当前工作目录）

5. 检查依赖：
   - pip show playwright >/dev/null 2>&1 || pip install playwright
   - playwright install chromium --with-deps 2>/dev/null || playwright install chromium

6. 执行：
   python render.py '<pages_json>' ./output

7. 告知用户输出文件路径列表：output/output_1.png ... output/output_N.png
```

---

## 依赖安装（首次使用）

```bash
pip install playwright
playwright install chromium
```

---

## 注意事项

- 中文字体渲染：脚本使用 `PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif` 作为默认后备字体栈，覆盖 macOS / Windows / Linux
- 截图分辨率：`device_scale_factor=2` 输出 2x 高清图，若原图为手机截图（750px 宽），输出实际像素为 1500px
- 若图片中首行为标题（字号/颜色明显不同），Claude 识别时应将其提取到 `title_font_size` 等字段，脚本会自动应用
- 改写幅度不要过大，以免破坏原排版的视觉节奏感（短句、停顿位置应尽量保留）
- 每张图片独立处理，互不影响，可并行分析

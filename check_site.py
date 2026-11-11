# -*- coding: utf-8 -*-
"""站点自检：内部链接、静态资源、锚点、基础结构。"""
import os
import re
import sys

try:  # Windows 控制台默认 GBK，避免中文/符号输出报错
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
PAGES = ["index.html", "advisor.html", "research.html", "projects.html",
         "publications.html", "join.html"]
ASSETS = ["assets/css/style.css", "assets/js/main.js"]

problems = []
info = []


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ---------- 1. 文件齐全 ----------
for rel in PAGES + ASSETS:
    p = os.path.join(ROOT, rel.replace("/", os.sep))
    if not os.path.isfile(p):
        problems.append("缺少文件: " + rel)
    else:
        size = os.path.getsize(p)
        info.append("%-24s %7d bytes" % (rel, size))

# ---------- 2. 收集各页面的 id 锚点 ----------
anchors = {}
for page in PAGES:
    p = os.path.join(ROOT, page)
    if not os.path.isfile(p):
        continue
    html = read(p)
    anchors[page] = set(re.findall(r'\bid="([^"]+)"', html))

# ---------- 3. 检查链接与资源 ----------
LINK_RE = re.compile(r'(?:href|src)\s*=\s*"([^"]+)"')
NAV_RE = re.compile(r'class="nav__link"')

for page in PAGES:
    p = os.path.join(ROOT, page)
    if not os.path.isfile(p):
        continue
    html = read(p)

    # 3a. 每个页面都要有完整的 6 项导航
    nav_hrefs = re.findall(r'class="nav__link"\s+href="([^"]+)"', html)
    expected = ["index.html", "advisor.html", "research.html",
                "projects.html", "publications.html", "join.html"]
    if nav_hrefs != expected:
        problems.append("%s 主导航不完整: %s" % (page, nav_hrefs))

    # 3b. 结构标签配对（粗查）
    for tag in ("section", "div", "ul", "ol", "li", "article", "aside", "main", "header", "footer", "nav"):
        o = len(re.findall(r"<%s[\s>]" % tag, html))
        c = len(re.findall(r"</%s>" % tag, html))
        if o != c:
            problems.append("%s <%s> 开闭不匹配: %d 开 / %d 闭" % (page, tag, o, c))

    # 3c. 链接检查
    for href in LINK_RE.findall(html):
        if href.startswith(("http://", "https://", "mailto:", "tel:", "data:", "#", "//")):
            if href.startswith("#") and href != "#":
                if href[1:] not in anchors[page]:
                    problems.append("%s 页内锚点不存在: %s" % (page, href))
            continue

        target, _, frag = href.partition("#")
        target = target or page
        tp = os.path.join(ROOT, target.replace("/", os.sep))
        if not os.path.isfile(tp):
            problems.append("%s 链接目标不存在: %s" % (page, href))
            continue
        if frag and target in anchors and frag not in anchors[target]:
            problems.append("%s 跨页锚点不存在: %s" % (page, href))

# ---------- 4. 统计与必备信息 ----------
for page in PAGES:
    p = os.path.join(ROOT, page)
    if not os.path.isfile(p):
        continue
    html = read(p)
    checks = {
        "lang=zh-CN": 'lang="zh-CN"' in html,
        "viewport": 'name="viewport"' in html,
        "charset": 'charset="UTF-8"' in html,
        "title": "<title>" in html,
        "description": 'name="description"' in html,
        "skip-link": 'class="skip-link"' in html,
        "main#main": 'id="main"' in html,
        "样式表": 'assets/css/style.css' in html,
        "脚本": 'assets/js/main.js' in html,
        "页脚邮箱": "y.zhang@njit.edu.cn" in html,
        "footer": 'class="site-footer"' in html,
    }
    bad = [k for k, v in checks.items() if not v]
    if bad:
        problems.append("%s 缺失: %s" % (page, ", ".join(bad)))

# ---------- 5. 论文条目数量 ----------
if os.path.isfile(os.path.join(ROOT, "publications.html")):
    pub_html = read(os.path.join(ROOT, "publications.html"))
    n_pub = len(re.findall(r'class="pub"', pub_html))
    n_ei = len(re.findall(r">EI<", pub_html))
    n_top = len(re.findall(r"中科院一区 Top", pub_html))
    n_esi = len(re.findall(r"ESI 高被引论文", pub_html))
    info.append("论文条目: %d 条 | 一区Top标记: %d | EI标记: %d | ESI标记: %d"
                % (n_pub, n_top, n_ei, n_esi))
    if n_pub != 7:
        problems.append("论文条目数应为 7，实际 %d" % n_pub)

# ---------- 输出 ----------
print("=" * 62)
print("站点自检报告")
print("=" * 62)
for line in info:
    print("  " + line)
print("-" * 62)
if problems:
    print("发现 %d 个问题：" % len(problems))
    for pr in problems:
        print("  [!] " + pr)
    sys.exit(1)
print("全部检查通过 [OK]")

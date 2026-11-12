# -*- coding: utf-8 -*-
"""内容核对：确认关键信息在页面中准确出现，且无误导性错误。"""
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
PAGES = ["index.html", "advisor.html", "research.html",
         "projects.html", "publications.html", "join.html"]

text = {}
for p in PAGES:
    with open(os.path.join(ROOT, p), "r", encoding="utf-8") as f:
        text[p] = f.read()

ALL = "\n".join(text.values())
PLAIN = re.sub(r"<[^>]+>", "", ALL)
PLAIN = re.sub(r"\s+", " ", PLAIN)

# 必须出现的关键事实
MUST = {
    "姓名": "张毅",
    "职称": "预聘副教授",
    "博士学位单位": "南京航空航天大学",
    "博士毕业时间": "2024 年 5 月",
    "联合培养单位": "奥克兰大学",
    "任职单位": "南京工程学院",
    "任职时间": "2024 年 9 月",
    "学会会员": "中国机械工程学会",
    "专委会": "江苏省工程师学会智能制造专业委员会",
    "参与国家重点研发计划": "国家重点研发计划",
    "参与国家自然科学基金": "国家自然科学基金项目 2 项",
    "成飞项目": "成飞公司工程实践项目",
    "在研基金全称": "国家自然科学基金青年科学基金项目",
    "在研基金C类": "C 类",
    "博士后基金": "中国博士后科学基金",
    "启动基金": "引进人才科研启动基金",
    "横向课题": "航天科工",
    "SCI数量": "SCI 期刊论文 6 篇",
    "EI数量": "EI 期刊论文 1 篇",
    "一区TOP数量": "4 篇",
    "ESI": "ESI 高被引",
    "热点论文": "热点论文",
    "被引量": "300 余次",
    "审稿期刊1": "Robotics and Computer-Integrated Manufacturing",
    "审稿期刊2": "International Journal of Computer Integrated Manufacturing",
    "在读硕士": "2 名",
    "研究生1": "乔森雨",
    "研究生2": "李雨澄",
    "研究生1入学": "2024 年 9 月入学",
    "研究生2入学": "2026 年 9 月入学",
    "招生学院": "自动化学院",
    "招生学科": "工学—电子信息—控制工程",
    "方向1": "具身智能驱动互认知人机协作智能系统",
    "方向2": "智能制造系统生产控制优化",
    "招生名额": "1—2 名",
    "邮箱": "y.zhang@njit.edu.cn",
}

# 论文标题与期刊，逐一核对
PAPERS = [
    ("Dual-stream adaptive graph convolutional network", "Journal of Manufacturing Systems", "2026"),
    ("考虑动态扰动的自组织制造系统调度优化与自适应决策方法", "Transactions of Nanjing University", "2025"),
    ("Dynamic decision-making for knowledge-enabled distributed", "Robotics and Computer-Integrated Manufacturing", "2024"),
    ("Dynamic job shop scheduling based on deep reinforcement", "Robotics and Computer-Integrated Manufacturing", "2022"),
    ("A flexible configuration method of distributed manufacturing", "Computers in Industry", "2021"),
    ("An improved hybrid particle swarm optimization", "Kybernetes", "2020"),
    ("An efficient IIoT gateway for cloud-edge collaboration", "Machines", "2022"),
]

problems = []

print("=" * 64)
print("内容核对报告")
print("=" * 64)

missing = [k for k, v in MUST.items() if v not in PLAIN]
if missing:
    problems.append("缺少关键信息: " + ", ".join(missing))
    for m in missing:
        print("  [!] 缺少: " + m)
else:
    print("关键信息 %d 项全部命中 [OK]" % len(MUST))

print("-" * 64)
pub = text["publications.html"]
pub_plain = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", pub))
bad_papers = []
for title, venue, year in PAPERS:
    if title not in pub_plain:
        bad_papers.append("标题缺失: " + title[:44])
    if venue not in pub_plain:
        bad_papers.append("期刊缺失: " + venue)
    if year not in pub_plain:
        bad_papers.append("年份缺失: " + year)
if bad_papers:
    problems.extend(bad_papers)
    for b in bad_papers:
        print("  [!] " + b)
else:
    print("7 篇论文的标题 / 期刊 / 年份全部命中 [OK]")

# 项目条目核对
print("-" * 64)
proj_plain = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", text["projects.html"]))
PROJ = ["国家自然科学基金青年科学基金项目", "中国博士后科学基金",
        "南京工程学院高层次引进人才科研启动基金", "航天科工企业技术开发横向课题",
        "成飞公司工程实践项目", "国家重点研发计划项目"]
bad_proj = [p for p in PROJ if p not in proj_plain]
if bad_proj:
    problems.append("项目缺失: " + ", ".join(bad_proj))
    for b in bad_proj:
        print("  [!] 项目缺失: " + b)
else:
    print("在研与已完成项目 %d 项全部命中 [OK]" % len(PROJ))

# 易错项：不应出现的表述
print("-" * 64)
FORBIDDEN = {
    "错误的学位年份": "2023 年 5 月于南京航空航天大学",
    "错误的职称表述": "副教授（教授）",
    "占位文本": "TODO",
    "示例文本": "Lorem ipsum",
    "未替换占位符": "XXX",
}
bad_f = [k for k, v in FORBIDDEN.items() if v in PLAIN]
if bad_f:
    problems.append("出现不应有的表述: " + ", ".join(bad_f))
    for b in bad_f:
        print("  [!] " + b)
else:
    print("未发现占位文本或错误表述 [OK]")

# 邮箱一致性
print("-" * 64)
for p in PAGES:
    n = text[p].count("y.zhang@njit.edu.cn")
    if n < 1:
        problems.append("%s 缺少邮箱" % p)
    print("  %-22s 邮箱出现 %d 次" % (p, n))

print("=" * 64)
if problems:
    print("发现 %d 个问题" % len(problems))
    sys.exit(1)
print("内容核对全部通过 [OK]")

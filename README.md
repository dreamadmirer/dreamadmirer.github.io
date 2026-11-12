# 智能制造与人机协作课题组 · 网站

南京工程学院自动化学院 · 张毅 课题组的中文介绍网站。纯静态站点（HTML + CSS + JavaScript），
**无需任何依赖、无需构建**，双击 `index.html` 即可在浏览器中打开。

---

## 一、文件结构

```
Harness-Worksapce/
├── index.html            首页：Hero、数据概览、核心方向、课题组简介、最新动态、招生入口
├── advisor.html          导师简介：个人简介、教育与工作经历、学术兼职、科研概况、研究生指导、在读研究生
├── research.html         研究方向：两条主线的细分课题、关键科学问题、研究支撑条件
├── projects.html         科研项目：主持在研项目、已完成/参与项目、学术服务
├── publications.html     代表论文：论文影响力数据、7 篇论文清单、标签筛选
├── join.html             招生信息：招生概览、方向与期望、培养情况、联系与申请
├── assets/
│   ├── css/style.css     全站样式（配色、排版、卡片、响应式、打印样式）
│   └── js/main.js        移动端导航、当前页高亮、论文筛选、页脚年份
├── check_site.py         结构自检（链接、资源、锚点、标签配对）
├── check_content.py      内容核对（关键信息、论文、项目、邮箱）
├── check_layout.js       排版自检（多视口横向溢出、移动端导航交互，需 Edge）
├── 404.html              自定义「页面未找到」（GitHub Pages 自动调用）
├── favicon.svg           浏览器标签页站点图标
├── robots.txt            搜索引擎抓取规则
├── sitemap.xml           站点地图（供搜索引擎收录）
├── .nojekyll             关闭 GitHub Pages 的 Jekyll 处理
├── .gitignore            排除本地自检产物与截图
└── _shots/               页面渲染截图预览（可删除，不纳入版本库）
```

所有页面共用同一套页头、页脚与样式表；修改导航或页脚时需要同步 7 个 HTML 文件
（6 个内容页 + `404.html`，且 `404.html` 内的链接使用以 `/` 开头的根路径）。

---

## 二、本地查看

**方式一（最简单）**：直接双击 `index.html`。

**方式二（推荐，行为更接近线上）**：在本目录启动一个本地服务器，然后访问
`http://localhost:8000/`。

```powershell
cd D:\Harness-Worksapce
python -m http.server 8000
```

**运行自检脚本**：

```powershell
python check_site.py        # 检查链接、资源、锚点与标签配对
python check_content.py     # 核对姓名、职称、论文、项目、邮箱等信息是否准确
node   check_layout.js      # 检查 360/390/430/768/1440px 下无横向溢出、移动端菜单可用
```

> `check_layout.js` 需要本机安装 Microsoft Edge；它通过无头浏览器 + 远程调试接口测量真实布局，
> 不依赖任何第三方 Node 模块。

---

## 三、内容维护指引

### 1. 更新论文（`publications.html`）

论文清单是一个有序列表，每条格式如下，按需复制一份并修改内容即可：

```html
<li class="pub" id="pub-8" data-tags="top hrc">
  <span class="pub__title">论文标题</span>
  <span class="pub__authors"><b>Zhang Y</b>*, 合作者, et al.</span>
  <span class="pub__venue">期刊名, 年份, 卷(期): 页码.</span>
  <div class="pub__badges">
    <span class="tag tag--accent">SCI</span>
    <span class="tag tag--gold">中科院一区 Top</span>
  </div>
</li>
```

- `data-tags` 决定该论文在筛选时归属于哪些分类，可用值：
  `top`（中科院一区 TOP）、`esi`（ESI 高被引）、`ei`（EI 期刊）、
  `hrc`（人机协作）、`sched`（调度与优化）。
- 序号 `[1] [2] …` 由 CSS 自动生成，**不需要手写**，插入或删除条目后会自动重排。
- `<b>` 标签用于突出本人署名位置；`*` 在页面说明中标注为通讯作者。

### 2. 更新项目（`projects.html`）

```html
<article class="proj">
  <div class="proj__no">05</div>
  <div>
    <h3 class="proj__title">项目名称</h3>
    <div class="proj__meta">
      <span class="tag tag--accent">主持</span>
      <span class="tag">在研</span>
      <span class="tag">2027 — 2029</span>
    </div>
  </div>
</article>
```

已结题项目的卡片加上 `proj--done` 类（`<article class="proj proj--done">`）会呈现为灰色调。

### 3. 更新动态（`index.html`）

在「最新动态」区块中复制一个 `<article class="card">`，修改
`card__meta`（时间 · 类型）与标题正文即可。

### 4. 调整配色

全站颜色集中在 `assets/css/style.css` 顶部的 `:root` 变量中，改一处即可全站生效：

| 变量 | 用途 | 当前值 |
| --- | --- | --- |
| `--navy` | 主色（页头、页脚、深色区块） | `#0b2748` |
| `--accent` | 强调色（按钮、标签、图标） | `#0e7c86` |
| `--gold` | 荣誉标记（一区 TOP、ESI） | `#b8860b` |

---

## 四、自我检查

三个脚本全部通过时均以退出码 0 结束。

### `check_site.py` — 结构自检

1. 6 个页面与 CSS / JS 资源文件是否齐全；
2. 每个页面的主导航是否为完整的 6 项且顺序一致；
3. 所有内部链接、跨页锚点（如 `publications.html#pub-4`）是否有效；
4. 主要结构标签（`section`/`div`/`ul`/`li` 等）开闭是否配对；
5. 每页是否包含 `lang="zh-CN"`、viewport、标题、描述、跳转链接、页脚邮箱等必备元素；
6. 论文条目数是否为 7 条，一区 TOP / EI / ESI 标记数量是否正确。

### `check_content.py` — 内容核对

逐项确认 36 条关键信息（姓名、职称、学历时间、项目名称、论文数量与引用数据、在读研究生、
招生学科、邮箱等）在页面中准确出现，7 篇论文的标题 / 期刊 / 年份与 6 个项目名称全部命中，
并检查是否残留 `TODO`、`XXX` 等占位文本。

### `check_layout.js` — 排版自检

在 360 / 390 / 430 / 768 / 1440px 五种宽度下逐一加载 6 个页面，检测是否存在
横向溢出（页面宽度超出视口会导致手机上出现左右滑动），并验证移动端汉堡按钮
位于视口内、点击可展开收起、6 个菜单项全部可见。

**修改内容后建议运行的顺序**：`check_site.py` → `check_content.py` → `check_layout.js`。

---

## 五、发布上线

### 1. 线上地址

本站已托管于 GitHub Pages：

- 访问地址：**https://dreamadmirer.github.io/**
- 代码仓库：https://github.com/dreamadmirer/dreamadmirer.github.io
- 部署方式：`main` 分支根目录直接发布，无构建步骤。

### 2. 关键配置说明

| 文件 / 设置 | 作用 |
| --- | --- |
| `.nojekyll` | 关闭 GitHub Pages 默认的 Jekyll 处理。缺少它时，以 `_` 开头的文件或目录会被忽略，部分静态资源可能 404。**请勿删除。** |
| `404.html` | 访问不存在的路径时由 GitHub Pages 自动返回，需使用以 `/` 开头的绝对路径引用资源（因为 404 可能在任意子路径下被请求）。 |
| `sitemap.xml` / `robots.txt` | 供搜索引擎收录与抓取。更换域名后需同步修改其中的网址。 |
| Settings → Pages | Source 设为 `Deploy from a branch`，Branch 设为 `main` / `(root)`。 |

### 3. 后续更新流程

内容更新只需三步（以修改 `publications.html` 为例）：

```powershell
cd "D:\Workbuddy Project\课题组网站"

# 1) 修改文件后本地自检，确认没有断链或排版问题
python check_site.py
python check_content.py

# 2) 提交
git add -A
git commit -m "更新论文列表"

# 3) 推送，GitHub Pages 自动重新发布
git push
```

推送后通常 **1 分钟内**自动上线（首次部署或改动较多时可能需要 2—3 分钟）。
可在仓库 **Actions** 标签页查看 `pages build and deployment` 的执行状态。

> 首次在新电脑上修改前，若未登录过 GitHub，`git push` 会要求凭据：
> 用户名填 GitHub 用户名，密码填 **Personal Access Token**（不是账户密码）。

### 4. 其他托管方式

站点同样可直接部署到校内服务器或云主机：把整个目录（不含 `_shots/`、`.git/`）上传到 Web 根目录即可，
无需 PHP、数据库或任何构建工具。

---

## 六、待补充内容

以下位置目前为通用表述，建议后续按实际情况丰富：

1. **导师照片**：可在 `advisor.html` 侧栏顶部加入个人照片。
2. **成员名单**：`advisor.html` 的「研究生指导」已列出在读研究生（乔森雨 · 2024 年 9 月入学、李雨澄 · 2026 年 9 月入学）；后续可扩展为独立「团队成员」页，补充照片与具体研究方向。
3. **科研成果图**：`research.html` 可加入研究框架图、实验平台照片或演示视频。
4. **论文链接**：可为每条论文补充 DOI / 期刊链接（在标题外包裹 `<a>` 标签）。
5. **课题组英文名**：当前使用 `Intelligent Manufacturing & HRC Group`，可按需调整。

---

## 七、联系方式

- 邮箱：y.zhang@njit.edu.cn
- 招生学院：自动化学院　招生学科：工学—电子信息—控制工程

© 智能制造与人机协作课题组

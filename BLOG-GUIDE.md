# 🍁 G7's Security Notes — 博客使用指南

## 目录

- [快速开始](#快速开始)
- [写新文章](#写新文章)
- [本地预览](#本地预览)
- [部署上线](#部署上线)
- [Giscus 评论配置](#giscus-评论配置)
- [主题升级](#主题升级)
- [常用操作速查](#常用操作速查)
- [目录结构说明](#目录结构说明)
- [文章 Front-matter 参考](#文章-front-matter-参考)
- [进阶功能](#进阶功能)

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18（当前 v24.16.0）
- **Git**

### 首次使用

```bash
# 1. 克隆仓库
git clone git@github.com:GU-007/GU-007.github.io.git
cd GU-007.github.io

# 2. 安装依赖
npm install

# 3. 启动本地预览
hexo server
# 浏览器打开 http://localhost:4000
```

---

## 写新文章

### 方式一：使用 Hexo 命令创建（推荐）

```bash
# 在博客根目录下执行
hexo new post "我的新文章标题"
```

这会在 `source/_posts/` 下生成 `我的新文章标题.md`，自动填充好 front-matter 模板。

### 方式二：手动创建

直接在 `source/_posts/` 目录下新建 `.md` 文件，按下面的模板写 front-matter：

```markdown
---
title: 文章标题
date: 2026-06-25 14:30:00
updated: 2026-06-25 14:30:00
tags: [SQL注入, Web安全, MySQL]
categories: 学习笔记
abbrlink: my-post-slug
description: 这篇文章讲什么（会显示在首页卡片和搜索结果中）
mathjax: false
mermaid: false
---

这里开始写正文...
```

### 推荐的分类（categories）

| 分类名 | 用途 |
|--------|------|
| `学习笔记` | 知识点整理、理论总结 |
| `靶场通关` | sqli-labs、DVWA 等靶场 Writeup |
| `CTF` | CTF 比赛 Writeup |
| `工具教程` | Burp Suite、sqlmap 等工具使用 |
| `Web安全` | Web 漏洞分析 |
| `逆向分析` | 二进制逆向相关 |
| `密码学` | 加解密相关内容 |

### 标签（tags）规范

- 用数组格式：`[SQL注入, Web安全, 数据库]` 或 YAML 列表
- 建议每篇文章 2-4 个标签
- 尽量复用已有标签（标签页会聚合所有同名标签的文章）

### Markdown 写作提示

```markdown
<!-- 代码块：指定语言获得语法高亮 -->
\`\`\`sql
SELECT * FROM users WHERE id = 1;
\`\`\`

\`\`\`python
import requests
r = requests.get('http://example.com?id=1')
\`\`\`

<!-- 提示框（Butterfly 特有） -->
{% note info %}
这是一个信息提示框
{% endnote %}

{% note warning %}
这是一个警告提示框
{% endnote %}

{% note danger %}
这是一个危险/注意提示框
{% endnote %}

<!-- Mermaid 流程图 -->
{% mermaid %}
graph LR
    A[用户输入] --> B{是否存在注入}
    B -->|是| C[构造Payload]
    B -->|否| D[尝试其他参数]
{% endmermaid %}

<!-- 折叠块 -->
{% folding 点击展开详情 %}
这里是被折叠的内容
{% endfolding %}

<!-- 表格 -->
| 函数 | 作用 | 示例 |
| --- | --- | --- |
| `database()` | 返回当前数据库名 | `SELECT database();` |
```

更多标签语法: https://butterfly.js.org/posts/2df239ce/

---

## 本地预览

```bash
# 清理缓存（修改配置后建议执行）
hexo clean

# 生成静态文件
hexo generate
# 或简写: hexo g

# 启动本地服务器（文件修改自动刷新）
hexo server
# 或简写: hexo s

# 一步到位：清理 + 生成 + 启动
hexo clean && hexo g && hexo s
```

浏览器访问 **http://localhost:4000**

- 修改文章内容会自动刷新
- 修改 `_config.yml` 或 `_config.butterfly.yml` 后需要重启 `hexo server`

---

## 部署上线

### 前提条件

1. **SSH Key 已配置** → 参考 [GitHub SSH Key 配置](#github-ssh-key-配置)
2. 运行过 `npm install` 安装了所有依赖

### 部署命令

```bash
# 清理 + 生成 + 部署（三合一）
hexo clean && hexo g && hexo d
```

其中 `hexo d` 等价于 `hexo deploy`，会把 `public/` 目录下的静态文件推送到 GitHub。

部署完成后等待 1-2 分钟，访问 **https://GU-007.github.io** 即可看到更新。

### 同时提交源代码（推荐）

```bash
# 部署完网站后，把 Hexo 源码也提交到 git
git add -A
git commit -m "描述你的修改"
git push origin main
```

> **说明**：`hexo deploy` 只推送生成的静态网页文件。把 Hexo 源码也提交到 git，换电脑后 `git clone` + `npm install` 就能继续写博客。

### GitHub SSH Key 配置

```bash
# 1. 生成 SSH Key（如果还没生成过）
ssh-keygen -t ed25519 -C "你的邮箱"

# 2. 查看公钥
cat ~/.ssh/id_ed25519.pub

# 3. 把公钥内容复制到 GitHub
#    打开 https://github.com/settings/keys
#    点击 "New SSH Key"，粘贴公钥内容，保存

# 4. 测试连接
ssh -T git@github.com
# 看到 "Hi GU-007!" 就说明成功了
```

---

## Giscus 评论配置

博客使用 Giscus 评论系统，基于 GitHub Discussions，免费无广告。

### 配置步骤

**第 1 步：启用 Discussions**

1. 打开 https://github.com/GU-007/GU-007.github.io
2. 点击 **Settings** → 勾选 **Discussions** （在 Features 区域）
3. 点 **Set up discussions**，选一个推荐分类（如 Announcements）

**第 2 步：获取配置参数**

1. 打开 https://giscus.app/
2. 填入仓库名：`GU-007/GU-007.github.io`
3. 依次选择你想要的配置，页面会自动生成参数
4. 记下这两个值：
   - `data-repo-id`（仓库 ID）
   - `data-category-id`（分类 ID）

**第 3 步：更新配置文件**

编辑 `_config.butterfly.yml`，找到 giscus 部分，替换：

```yaml
giscus:
  repo: GU-007/GU-007.github.io
  repo_id: 'R_kgDOxxxxxx'        # ← 改成你的
  category: Announcements
  category_id: 'DIC_kwDOxxxxxx'  # ← 改成你的
  light_theme: light
  dark_theme: dark_dimmed
  js:
  option:
```

**第 4 步：重新部署**

```bash
hexo clean && hexo g && hexo d
```

完成后访问任意一篇文章，底部应该会出现评论区。

---

## 主题升级

Butterfly 主题更新时，按以下步骤升级：

```bash
# 1. 升级主题包
npm update hexo-theme-butterfly

# 2. 备份你的配置（防止出错）
cp _config.butterfly.yml _config.butterfly.yml.bak

# 3. 对比新版默认配置，把新增的选项合并到你的配置中
# 新版默认配置在: node_modules/hexo-theme-butterfly/_config.yml

# 4. 测试
hexo clean && hexo g && hexo s

# 5. 确认无误后部署
hexo clean && hexo g && hexo d
```

> **提示**：你自定义的主题色和 CSS 都在 `_config.butterfly.yml` 和 `source/css/custom.css` 中，升级主题不会覆盖它们。

---

## 常用操作速查

```bash
# ── 写文章 ──
hexo new post "文章标题"         # 新建文章
hexo new page "页面名称"         # 新建页面（如关于页）
hexo new draft "草稿标题"        # 新建草稿（不会发布）

# ── 本地预览 ──
hexo clean                      # 清理缓存和已生成文件
hexo generate                   # 生成静态文件（简写 hexo g）
hexo server                     # 启动预览服务器（简写 hexo s）
hexo server -p 5000             # 在指定端口启动（默认4000）

# ── 部署 ──
hexo deploy                     # 部署到 GitHub Pages（简写 hexo d）
hexo clean && hexo g && hexo d  # 一键三连：清理 + 生成 + 部署

# ── 草稿 ──
hexo publish post "草稿标题"    # 将草稿发布为正式文章

# ── 列出 ──
hexo list post                  # 列出所有文章
hexo list page                  # 列出所有页面
hexo list tag                   # 列出所有标签
hexo list category              # 列出所有分类
```

---

## 目录结构说明

```
GU-007.github.io/
├── _config.yml                  # Hexo 主配置（站点信息、URL、插件配置）
├── _config.butterfly.yml        # Butterfly 主题配置（主题色、菜单、功能开关）
├── package.json                 # npm 依赖声明
├── scaffolds/                   # 文章模板
│   └── post.md                  # 新文章的默认 front-matter 模板
├── source/                      # 源文件目录（你主要修改的地方）
│   ├── _posts/                  # 📝 博客文章（Markdown 文件）
│   │   ├── 2026-04-30-git-instructions.md
│   │   ├── 2026-05-05-sql-injection-notes.md
│   │   └── 2026-05-05-sqli-labs-writeup.md
│   ├── _data/                   # Butterfly 数据文件
│   ├── about/                   # 关于页面
│   │   └── index.md
│   ├── categories/              # 分类页面
│   │   └── index.md
│   ├── tags/                    # 标签页面
│   │   └── index.md
│   ├── search/                  # 搜索页面
│   │   └── index.md
│   ├── css/
│   │   └── custom.css           # 🎨 自定义 CSS（枫叶主题样式）
│   └── img/                     # 图片资源
│       ├── maple-bg.jpg         # 背景图
│       ├── favicon.svg          # 网站图标
│       └── avatar.svg           # 头像
├── themes/
│   └── butterfly/               # Butterfly 主题（不要直接修改这里）
├── public/                      # 生成的静态网站（hexo generate 后产生）
├── node_modules/                # npm 依赖（gitignore 了）
└── .gitignore
```

---

## 文章 Front-matter 参考

```yaml
---
title: 文章标题（必填）
date: 2026-06-25 14:30:00    # 发布时间
updated: 2026-06-25 18:00:00  # 更新时间（可选）
tags:                          # 标签
  - SQL注入
  - Web安全
  - MySQL
categories: 学习笔记           # 分类（建议只填一个）
abbrlink: sql-injection-notes  # 永久链接标识（英文，可选，不填则自动生成）
description: 摘要描述           # 会显示在首页卡片和搜索结果中
mathjax: false                 # 是否需要数学公式渲染
mermaid: false                 # 是否需要 Mermaid 图表
top_img: /img/maple-bg.jpg    # 文章顶部横幅图（可选，不填用默认图）
cover:                         # 文章封面图（可选）
toc: true                      # 是否显示目录（默认 true）
comments: true                 # 是否显示评论（默认 true）
---
```

---

## 进阶功能

### 文章加密

在 front-matter 中添加 `password` 字段：

```yaml
---
title: 敏感研究笔记
password: 123456
---
```

访问这篇文章时，读者需要输入密码才能查看内容。适合存放不想公开的安全研究。

### 自定义横幅图

```yaml
---
top_img: https://example.com/my-image.jpg
---
```

或者在 `_config.butterfly.yml` 中为不同分类/标签设置专属横幅：

```yaml
category_per_img:
  - category name: CTF
    url: /img/ctf-banner.jpg
  - category name: Web安全
    url: /img/websec-banner.jpg
```

### SEO 优化建议

- 每篇文章务必填写 `description`（显示在搜索结果的摘要中）
- `tags` 尽量精确，方便检索
- 文章标题用中文或英文都可以，但建议保持一致

### 图片引用

```markdown
<!-- 引用本地图片（放在 source/img/ 目录下） -->
![描述](/img/my-image.png)

<!-- 引用外部图片 -->
![描述](https://example.com/image.png)
```

> 建议把图片放在 `source/img/` 目录下统一管理，引用路径以 `/img/` 开头。

### 换电脑后恢复

```bash
# 1. 克隆仓库
git clone git@github.com:GU-007/GU-007.github.io.git
cd GU-007.github.io

# 2. 安装依赖
npm install

# 3. 开始写博客
hexo server
```

---

## 参考链接

- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [Butterfly 主题文档](https://butterfly.js.org/)
- [Butterfly 标签插件](https://butterfly.js.org/posts/2df239ce/)
- [Giscus 评论系统](https://giscus.app/)
- [GitHub SSH Key 帮助](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

---

> 🍁 最后更新：2026-06-25

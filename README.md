# Maple / G7 · Web 安全笔记

静态站点。`site/` 就是发布的全部内容，改完 `git push` 到 `main`，GitHub Actions 会把它原样发到 Pages。

## 结构

```
site/                 发布目录（整个网站）
  index.html          首页
  notes.html          文章列表（带搜索/筛选）
  post.html           文章：SSRF 从 0 到 1
  post-http.html      文章：HTTP 基础
  post-php.html       文章：PHP 语言基础
  projects.html       项目（贴墙板）
  links.html          友链（邮票墙）
  about.html          关于
  style.css           全部样式
  app.js              全部脚本（时钟/日历/签/终端/搜索/目录）
  img/                图片

_source/posts/        三篇文章的 markdown 原文（不发布，留着改稿用）
.github/workflows/    部署流程
```

## 改内容

大部分文字直接改 `site/*.html` 里对应的部分即可。几处不在 HTML 里的：

| 内容 | 在哪 |
|---|---|
| 首页"今日签"的十条宜忌 | `site/app.js` 里 `FORTUNE` |
| 首页终端能执行的命令 | `site/app.js` 里 `CMDS` 和 `FILES` |
| 友链列表 | `site/links.html` 里每个 `.stamp` |
| 每篇文章的正文 | `site/post*.html` 里 `<div class="prose">` 内部 |

## 缓存

页面引用的是 `style.css?v=N` / `app.js?v=N`。改完样式或脚本，把 `site/*.html` 里所有 `?v=` 后面的数字加一，浏览器才会重新拉取。

## 部署

push 到 `main` 即触发。仓库 Settings → Pages 的 Source 需要是 **GitHub Actions**。

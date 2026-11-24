# Maple / G7 · Web 安全笔记

静态站点。`site/` 就是发布的全部内容，改完 `git push` 到 `main`，GitHub Actions 会把它原样发到 Pages。

## 结构

```
site/                 发布目录（整个网站）
  index.html          首页
  notes.html          文章列表（带搜索 / 分类筛选）
  post.html           SSRF 从 0 到 1
  post-http.html      HTTP 基础
  post-php.html       PHP 语言基础
  post-java-deserialize.html   Java 反序列化
  post-include-0.html          赛事 WP：include 0。0
  post-include-pear.html       赛事 WP：Include 🍐
  projects.html       项目
  links.html          友链
  about.html          关于
  style.css           全部样式
  app.js              全部脚本（时钟 / 日历 / 今日签 / 终端 / 搜索 / 目录）
  img/                图片

.github/workflows/deploy.yml   部署流程
```

## 缓存

页面引用的是 `style.css?v=N` / `app.js?v=N`。改完样式或脚本，把 `site/*.html` 里所有 `?v=` 后面的数字加一，浏览器才会重新拉取。

## 部署

push 到 `main` 即触发。仓库 Settings → Pages 的 Source 需要是 **GitHub Actions**。

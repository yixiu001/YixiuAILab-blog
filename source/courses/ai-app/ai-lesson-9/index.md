---
layout: course
title: 第 9 节：打包与部署
date: 2026-11-20 10:00:00
categories: [AI 实战课]
tags: [AI工具, 部署]
course: ai-app
chapter: 9
lesson_title: 打包与部署
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=2XJUSpqGRWE
cover: /images/videos/2XJUSpqGRWE.jpg
duration: 20:05
views: 4.2万
summary: 把本地做好的应用部署到线上，让任何人都能访问。本节对比几种部署方案，演示从打包到上线的完整流程。
---

本地跑通只是第一步，部署上线才算真正做成。这节我们挑一个方案把应用发出去。

{% note info 部署前的检查清单 %}
密钥全部改用环境变量、去掉调试日志、确认免费额度能撑住预期访问量、准备好自定义域名（可选）。
{% endnote %}

### 一、方案选择

{% tabs %}
{% tab 平台托管 %}
最简单，推代码或点几下就能上线，适合快速验证。免费额度有限，流量大后要付费。
{% endtab %}
{% tab 云服务器 %}
自由度最高，适合长期项目和复杂需求，但需要自己维护环境和安全。
{% endtab %}
{% endtabs %}

### 二、环境变量

{% folding 为什么密钥不能写死在代码里 %}
写死在代码里一旦上传仓库就会泄露，可能被刷爆额度。用环境变量注入，部署平台和本地都能安全配置。
{% endfolding %}

### 三、上线验证

部署完成后用手机流量访问一次（排除缓存干扰），测试核心功能和错误处理。确认无误后绑定域名、开启 HTTPS。

下一节我们做性能优化，让应用更快更省。

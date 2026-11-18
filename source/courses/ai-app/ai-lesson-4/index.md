---
layout: course
title: 第 4 节：搭建你的第一个 AI 助手
date: 2026-11-20 10:00:00
categories: [AI 实战课]
tags: [AI工具, 实战]
course: ai-app
chapter: 4
lesson_title: 搭建你的第一个 AI 助手
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=kTVRMm4J5pw
cover: /images/videos/kTVRMm4J5pw.jpg
duration: 21:15
views: 7.4万
progress: 33%
summary: 用一个「写作助手」案例，讲清系统提示词（System Prompt）的写法，让 AI 稳定按你要求的角色和格式输出。
---

工具准备好了，这节开始做真正的东西——一个能稳定帮你写作的 AI 助手。

### 一、什么是系统提示词

系统提示词决定了 AI 的身份、语气和输出格式，优先级高于用户对话。写好它，等于给助手立了一份岗位说明书。

{% note success 一个好提示词的要素 %}
角色 + 任务 + 输出格式 + 约束条件，四样齐全，输出就稳定。
{% endnote %}

### 二、实战：写作助手

{% tabs %}
{% tab 基础版 %}
你是一位科技博客编辑，擅长把复杂工具讲得通俗易懂。请用三段式结构输出：它是什么、解决什么问题、适合谁用。
{% endtab %}
{% tab 进阶版 %}
在基础版之上加入约束：每段不超过 80 字，避免使用专业术语，结尾给出一句适合做视频标题的话。
{% endtab %}
{% endtabs %}

把提示词粘进 Cherry Studio 的系统提示词框，新建会话测试几篇不同主题的文章，观察输出是否稳定。

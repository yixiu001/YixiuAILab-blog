---
layout: course
title: 第 5 节：知识库与文档问答
date: 2026-11-16 10:00:00
categories: [AI 实战课]
tags: [AI工具, 知识库]
course: ai-app
chapter: 5
lesson_title: 知识库与文档问答
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=2XJUSpqGRWE
cover: /images/videos/2XJUSpqGRWE.jpg
duration: 24:40
views: 5.8万
summary: 让 AI 基于你自己的文档回答问题。本节讲清知识库的构建流程：文档切分、向量化、检索增强，以及提升回答准确率的关键技巧。
---

大模型不知道你的私有资料，知识库就是解决这个问题的——把文档喂给它，让它基于你的内容回答。

{% note info 核心原理 %}
文档先被切分成小块并转成向量存起来；提问时先检索出相关片段，再连同问题一起交给模型，这就是 RAG（检索增强生成）。
{% endnote %}

### 一、准备文档

支持的格式包括 PDF、Word、Markdown、TXT。文档越干净，效果越好——扫描件需要先做 OCR。

### 二、切分与导入

{% tabs %}
{% tab 自动切分 %}
按固定长度切分，适合结构简单的文档。块大小一般设 500-1000 字符，重叠 100 字符左右。
{% endtab %}
{% tab 按标题切分 %}
按文档章节标题切分，能保留语义完整性，问答效果通常更好，推荐优先使用。
{% endtab %}
{% endtabs %}

### 三、提问技巧

{% folding 为什么回答总是不准确？ %}
三个常见原因：文档切分太碎丢失上下文、检索返回的片段不相关、模型没拿到足够的片段。逐一调整块大小、检索数量和提示词即可改善。
{% endfolding %}

{% gallery /images/cherry-1.png|图 1 · 导入文档界面 /images/cherry-2.png|图 2 · 问答效果对比 %}

知识库是 AI 应用里最实用的能力之一，下一节我们把它接进自动化流程。

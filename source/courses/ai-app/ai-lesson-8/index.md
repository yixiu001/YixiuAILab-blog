---
layout: course
title: 第 8 节：多模态能力实战
date: 2026-11-19 10:00:00
categories: [AI 实战课]
tags: [AI工具, 多模态]
course: ai-app
chapter: 8
lesson_title: 多模态能力实战
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=-Lj0qYi_C6Q
cover: /images/videos/-Lj0qYi_C6Q.jpg
duration: 22:10
views: 4.6万
summary: 让应用既能看图也能听声。本节实战图片识别、语音转写与图文混合输入，做一个能读懂截图并回答问题的助手。
---

多模态就是让模型同时理解文字、图片甚至声音。这节我们把看图能力接进应用。

{% note info 能做什么 %}
识别截图里的文字、描述图片内容、解读图表数据、读取手写笔记——这些都是多模态的典型场景。
{% endnote %}

### 一、图片输入

选择支持视觉的模型，把图片编码后随问题一起发送。多数平台在 API 层直接支持图片 URL 或 Base64。

{% tabs %}
{% tab 截图问答 %}
上传界面截图，让模型说明这是什么、怎么操作，适合做教程助手。
{% endtab %}
{% tab 图表解读 %}
上传数据图表，让模型读出趋势和关键数值，适合做数据分析辅助。
{% endtab %}
{% endtabs %}

### 二、语音能力

{% folding 语音转写准确率不高怎么办 %}
选用专用的语音转写模型而非通用多模态模型，并在提示词里提供领域词表（如专业名词），准确率会明显提升。
{% endfolding %}

### 三、组合起来

把图片、文字、搜索结果一起喂给模型，就是把前几节的能力叠加。一个能看懂截图、又能联网核实的助手，雏形就出来了。

{% gallery /images/cherry-1.png|图 1 · 图片识别演示 /images/cherry-2.png|图 2 · 多模态问答界面 %}

到这里核心功能都齐了，下一章我们把它打包部署上线。

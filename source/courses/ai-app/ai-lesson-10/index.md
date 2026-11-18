---
layout: course
title: 第 10 节：性能优化
date: 2026-11-21 10:00:00
categories: [AI 实战课]
tags: [AI工具, 性能]
course: ai-app
chapter: 10
lesson_title: 性能优化
course_title: 从零打造 AI 应用：完整实战课程
badge: AI 实战课 · 共 12 节
video: https://www.youtube.com/watch?v=h9PJK64By4E
cover: /images/videos/h9PJK64By4E.jpg
duration: 17:33
views: 3.8万
summary: 让应用响应更快、体验更顺。本节从缓存、流式输出、并发控制三个角度优化性能，并给出可量化的评估方法。
---

能用之后要追求好用。响应速度直接决定体验，这节讲几个见效最快的优化点。

{% note info 先测量再优化 %}
优化前先记录首字响应时间和完整响应时间，否则无法判断改动是否有效。
{% endnote %}

### 一、流式输出

把模型回答改成流式返回，用户几乎立刻看到第一个字，体感速度提升巨大。多数平台的 SDK 只需改一个参数。

### 二、缓存

{% tabs %}
{% tab 结果缓存 %}
对完全相同的问题缓存答案，适合高频重复查询。注意设置合理的过期时间。
{% endtab %}
{% tab 向量缓存 %}
知识库检索结果缓存起来，避免每次都重新计算，能明显降低延迟。
{% endtab %}
{% endtabs %}

### 三、并发与限流

{% folding 用户一多就报限流错误怎么办 %}
在应用侧加请求队列和并发上限，超出的请求排队而不是直接打爆 API。同时给用户体验上加排队提示。
{% endfolding %}

优化是持续过程，下一节我们聊聊绕不开的成本和安全问题。

---
title: pdf批量转图片
date: 2025-06-24 14:49:22
tags:
  - pdf转图片
categories:
  - 知识记录
---

## 今天遇到一个需求，要求弹窗展示政策pdf内容，为了方便，文件直接放在前端项目中。由于pdf文件体积较大，且仅需展示其内容，故决定将pdf转成图片放在项目中，以缩小文件体积

### 解决方案：使用 [ImageMagick](https://www.imagemagick.org/) + [Ghostscript](https://www.ghostscript.com/) 处理pdf文件

以下是封装过的bat脚本

```bat
@echo off
setlocal enabledelayedexpansion

:: 设置目标 DPI，调整这里即可改变分辨率
set dpi=150

:: 设置输出图片的质量（范围：1-100）
set quality=80

:: 定义 A4 的实际尺寸（单位：英寸）
set a4_width_inch=8.27
set a4_height_inch=11.69

:: 使用 PowerShell 动态计算 A4 分辨率（宽度和高度）
for /f "tokens=*" %%A in ('powershell -Command "[math]::Round(%a4_width_inch% * %dpi%)"') do set width=%%A
for /f "tokens=*" %%A in ('powershell -Command "[math]::Round(%a4_height_inch% * %dpi%)"') do set height=%%A

:: 输出宽高以及质量参数以供验证
echo DPI: %dpi%
echo Width: %width% pixels
echo Height: %height% pixels
echo Quality: %quality%%

:: 验证宽高是否正确
if "%width%"=="" (
    echo 宽度计算失败，请检查 PowerShell 是否可用或计算逻辑是否正确。
    pause
    exit /b
)
if "%height%"=="" (
    echo 高度计算失败，请检查 PowerShell 是否可用或计算逻辑是否正确。
    pause
    exit /b
)

:: 遍历当前目录中的所有 PDF 文件
for %%f in (*.pdf) do (
    :: 获取文件名（不带扩展名）
    set filename=%%~nf
    :: 创建与 PDF 同名的输出目录
    mkdir "!filename!"
    :: 转换 PDF 为图片，确保背景为白色，大小统一，设置质量
    magick -density %dpi% "%%f" -background white -alpha remove -alpha off -resize %width%x%height% -gravity center -extent %width%x%height% -quality %quality% "!filename!\page-%%d.webp"
)

pause

```

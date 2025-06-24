---
title: PDF批量转图片
date: 2025-06-24 14:49:22
tags:
  - PDF转图片
  - 前端优化
  - 实用工具
categories:
  - 技术笔记
---

## 背景

最近在做一个项目，需要在弹窗里展示政策PDF内容。本来想着直接把PDF文件放在前端项目里，但一个文件大几十M，加载起来很慢。而且客户不想看到PDF在网页中的预览框。
考虑到只是展示内容，不需要交互功能，就想着把PDF转成图片，这样既能缩小文件体积，又能提升加载速度。

## 解决方案

经过一番搜索，发现 **ImageMagick** 是个不错的选择。它不仅能处理PDF转图片，还支持批量处理，正好符合我的需求。

### 工具准备

1. **安装 [ImageMagick](https://www.imagemagick.org/)**
   - Windows: 下载安装包或使用 `choco install imagemagick`
   - 安装后记得重启命令行

2. **验证安装**

   ```bash
   magick --version
   ```

3. **安装ImageMagick底层依赖 [Ghostscript](https://www.ghostscript.com/)**
   - 下载适合系统版本的安装包（通常是 `gswin64.exe`）
4. **验证安装**

   ```bash
   gswin64c -version
   ```

## 批量转换脚本

为了方便使用，我写了个批处理脚本，支持批量转换PDF文件：

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

echo 转换完成！
pause
```

## 使用心得

### 参数调优经验

- **DPI设置**：
  - 150 DPI：适合大多数场景，文件大小和质量比较平衡
  - 200 DPI：高清显示，文件稍大
  - 100 DPI：文件最小，但可能不够清晰

- **质量设置**：
  - 80-90：推荐设置
  - 70以下：文件小但质量一般
  - 95以上：质量好但文件大

### 效果对比

转换后的文件结构：

```text
项目/
├── convert_pdf_to_images.bat
├── 政策文件.pdf
└── 政策文件/
    ├── page-0.webp
    ├── page-1.webp
    └── ...
```

**文件大小对比**：

- 原PDF：41.6MB
- 转换后：约5.3M（WebP格式）
- 压缩率：约87%

## 总结

这个方案在一定程度上解决了我的问题：

- ✅ 1M以上的文件体积基本都大幅压缩了
- ✅ 加载速度明显提升
- ✅ 保持了良好的显示效果
- ✅ 支持批量处理，效率高

对于类似的需求，我觉得这个方案还是挺实用的。如果只是展示内容，转成图片确实比直接使用PDF要好很多。

---

*记录一下这个实用的解决方案，以后遇到类似需求可以直接用。*

/*
 * @Description:
 * @Author: FBZ
 * @Date: 2025-06-24 16:37:05
 * @LastEditors: FBZ
 * @LastEditTime: 2025-06-24 16:39:05
 */
// scripts/copy-static.js
const fs = require('fs')
const path = require('path')

hexo.on('generateAfter', () => {
  const src = path.join(hexo.source_dir, 'static')
  const dest = path.join(hexo.public_dir)

  // 检查源目录是否存在
  if (!fs.existsSync(src)) {
    console.log('Static directory does not exist, skipping copy...')
    return
  }

  // 确保目标目录存在
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  try {
    fs.readdirSync(src).forEach((file) => {
      const srcPath = path.join(src, file)
      const destPath = path.join(dest, file)

      // 检查源文件是否存在
      if (fs.existsSync(srcPath)) {
        // 如果是目录，递归复制
        if (fs.statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath)
        } else {
          // 复制文件
          fs.copyFileSync(srcPath, destPath)
          console.log(`Copied: ${file}`)
        }
      } else {
        console.warn(`Source file not found: ${srcPath}`)
      }
    })
  } catch (error) {
    console.error('Error copying static files:', error.message)
  }
})

// 递归复制目录的辅助函数
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  fs.readdirSync(src).forEach((file) => {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  })
}

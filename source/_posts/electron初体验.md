---
title: electron初体验
date: 2025-07-17 14:59:35
tags:
  - electron
categories:
  - 技术笔记
---

## 背景

近期因为一些原因，需要频繁切换网络环境，每次切换环境都需要拔插网线或者是从控制面板中禁用网卡。不喜欢这种重复的无意义操作，便寻思可以写个脚本调用方法来切换网卡状态，于是先整了个脚本，但是每次还需要双击运行，而且无法直观地看到两个网卡当前的状态，又想到或许可以用electron构建个app，用js调用api来切换网卡状态，遂跟gpt老师进行了一番探讨，成功写了个小软件实现实时监控网卡状态+一键切换网络环境的功能。

## 软件样式设计

输入需求让gpt老师帮忙画了个设计图，最终实现效果如下：

{% asset_img PixPin_2025-07-17_15-38-55.png 软件实现效果 %}

## 代码实现

有了设计图就可以开工了，由于对electron并不了解，让gpt先帮忙搭了个框架。

### 项目结构

```text
network-switch-app/
├── main.js              // 主进程：窗口创建、状态检测、指令执行
├── preload.js           // 预加载脚本（可用于暴露安全 API）
├── renderer/            // 渲染进程
│   ├── index.html
│   ├── renderer.js
├── assets/
│   └── icon.ico         // 应用图标
├── config.json          // 网卡名配置文件（intranet/internet）
├── package.json
```

`main.js` 中开启程序窗口以及调用系统API，`preload.js` 中挂载全局方法，在`renderer`中实现页面内容以及js逻辑处理

### 主进程 main.js 核心功能

#### 1. 创建窗口

```javascript
const win = new BrowserWindow({
  width: 280,
  height: 160,
  useContentSize: true,
  frame: false,
  alwaysOnTop: true,
  resizable: false,
  transparent: true,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
  icon: path.join(__dirname, 'assets', 'icon.ico'),
})
```

#### 2.读取可编辑的配置文件

```javascript
const configPath = path.join(path.dirname(app.getPath('exe')), 'config.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
```

#### 3. 执行网络切换（Windows）

```bash
exec(`netsh interface set interface name="${name}" admin=ENABLED`)
```

#### 4. 获取网卡状态

```javascript
const getAdapterStatus = (name) =>
  new Promise((resolve) => {
    exec(
      `powershell -Command "(Get-NetAdapter -Name \\"${name}\\" -ErrorAction SilentlyContinue).Status"`,
      (err, stdout) => {
        const status = stdout.trim()
        resolve(status === 'Up' ? 'Up' : 'Down')
      }
    )
  })
```

### API串联

#### 1. main.js：主进程注册功能

```javascript
// 网卡状态检查
ipcMain.handle('get-status', async () => {})
// 切换模式
ipcMain.handle('toggle-mode', async () => {})
```

#### 2. preload.js：暴露 API 的桥梁

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('networkAPI', {
  getStatus: async () => await ipcRenderer.invoke('get-status'),
  toggleMode: async () => await ipcRenderer.invoke('toggle-mode')
})
```

#### 3. renderer.js：渲染进程使用 API

```javascript
async function updateStatus() {
  const status = await window.networkAPI.getStatus()
}
```

## 打包构建

```json
"build": {
  "appId": "com.fbz.networkswitch",
  "productName": "内外网切换器",
  "files": [
    "main.js",
    "preload.js",
    "renderer/**/*",
    "config.json"
  ],
  "extraFiles": [
    {
      "from": "config.json",
      "to": "config.json"
    }
  ],
  "directories": {
    "buildResources": "assets",
    "output": "dist"
  },
  "win": {
    "target": "nsis",
    "icon": "assets/icon.ico",
    "sign": false
  },
  "nsis": {
    "oneClick": false,
    "perMachine": true
  }
}
```

注意事项：

- win图标需要使用多分辨率图标，`16x16`, `32x32`, `48x48`, `256x256` 都包含在 `.ico` 文件中。（在线转换工具: <https://www.aconvert.com/cn/icon/png-to-ico/>）

## 结语

之前也有想研究electron，但是一直没什么契机，这次刚好遇到这种需求，便借着chatgpt写了个小工具，也算是对其有了初步的认知，使用electron前端开发也能快速上手开发程序了。
待下一次有新想法的时候，再深入研究研究

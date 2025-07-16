---
title: hexo的使用
date: 2025-07-07 11:45:46
tags:
  - HEXO
categories:
  - 技术笔记
---

## 背景

前几年搭建了博客，但是一直都没有投入编写内容，最近又捡起来重新折腾了一下，重新梳理了一下hexo的使用，加深了理解，在此记录一下做个备忘。

## 一、安装与使用

### 1. 安装 Hexo CLI

```bash
npm install -g hexo-cli
```

### 2. 初始化博客项目

```bash
hexo init blog
cd blog
npm install
```

### 3. 安装并启用主题

个人喜欢Next主题的样式，因此这里选用[Next主题](https://github.com/next-theme/hexo-theme-next)

```bash
# 使用npm安装主题
npm install hexo-theme-next
# 拷贝配置文件到根目录
cp node_modules/hexo-theme-next/_config.yml _config.next.yml
```

修改`_config.yml`中的`theme`，以启用next主题

```yml Hexo config file
theme: next
```

可以在`_config.next.yml`中修改`scheme`以切换系统样式，个人喜欢`gemini`的设计

```yml Next config file
scheme: Gemini
```

### 4. 创建文章

```bash
hexo new "文章标题"
```

生成文件位于：`source/_posts/文章标题.md`

### 5. 本地预览

```bash
hexo server
```

访问：<http://localhost:4000> 进行本地预览

## 二、推荐插件

### 1. hexo-generator-sitemap

部署/运行时会生成sitemap

执行`npm i hexo-generator-sitemap`安装

并在配置文件`_config.yml`中添加以下配置，重新编译运行并访问<http://localhost:4000/sitemap.xml>即可看到网站地图的输出了

```yml Hexo config file
sitemap:
  path: sitemap.xml
```

### 2. hexo-generator-searchdb

开启本地搜索功能

执行`npm i hexo-generator-searchdb`安装

并在配置文件`_config.yml`中添加以下配置，重新编译运行后点击菜单栏的“搜索”按钮，即可搜索站内博客

```yml Hexo config file
search:
  enable: true
```

## 三、部署与SEO优化

### 部署方案

一开始采用GitHub托管，有提交自动触发构建并部署，然后域名解析到GitHub部署页面的方案。但是由于gfw，墙内访问比较困难（公司破网挂不挂梯子都很难打开自己的博客），且添加评论时，会遇到跨域问题不好解决。遂改为在服务器上打包构建，用nginx部署。

在服务器上拉取仓库并执行`npm i`安装依赖，在仓库根目录创建部署脚本`deploy.sh`

```sh deploy.sh
#!/bin/bash

echo "🔄 拉取最新代码..."
cd /home/webapps/blog
git pull origin main

echo "📦 安装依赖..."
npm install

echo "🧹 清理旧生成文件..."
npx hexo clean

echo "📝 生成静态文件..."
npx hexo generate
```

输入`bash /path/to/deploy.sh`即可执行部署脚本自动打包构建。

### 证书申请

配置nginx之前，还需要注册一下证书以开启https协议。

首先确保`/etc/ssl/certs`、`/etc/ssl/private`目录存在，若不存在，执行以下命令创建目录并赋予权限

```bash
mkdir -p /etc/ssl/private
chmod 700 /etc/ssl/private

mkdir -p /etc/ssl/certs
chmod 700 /etc/ssl/certs
```

执行以下命令签发证书，指定letsencrypt服务可以不用注册邮箱，且支持自动续期

```bash
# 先停止nginx服务
bt stop nginx

# 签发证书
acme.sh --issue --standalone -d your.domain.com --ecc --server letsencrypt

# 安装证书，最后的reloadcmd修改为本机重载ng配置的指令，我用宝塔面板安装的，因此执行bt reload nginx
acme.sh --install-cert -d your.domain.com --ecc \
  --key-file       /etc/ssl/private/your.domain.com.key \
  --fullchain-file /etc/ssl/certs/your.domain.com_bundle.crt \
  --reloadcmd     "bt reload nginx"

# 重载nginx
bt reload nginx
```

### nginx配置

接下来在nginx配置中添加以下配置，再重载即可访问部署后的博客页面了

```conf nginx.conf
server {
  listen 80;
  server_name your.domain.com;

  # 强制跳转到 HTTPS
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl;
  server_name your.domain.com;

  # SSL 证书路径（你需要替换成自己的）
  ssl_certificate /etc/ssl/certs/your.domain.com_bundle.crt;
  ssl_certificate_key /etc/ssl/private/your.domain.com.key;
  ssl_session_timeout 5m;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  root /path/to/博客仓库/public;
  index index.html;

  access_log /www/wwwlogs/access_blog.log;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### SEO优化

SEO优化比较复杂，只是记录下自己做过的操作，还在研究学习中。

以谷歌搜索为例，访问地址：<https://search.google.com/search-console>，输入要索引的域名，谷歌会返回一个校验码文件。创建一个静态文件目录`source/static`存放这个文件。

并在hexo配置文件中添加跳过渲染内容，避免部署后访问校验文件时出现内容嵌套在博客框架中，导致校验不通过的问题。重新打包并访问<https://your.domain.com/googledxxxxxxxxxx>应该能看到输出`google-site-verification: googledxxxxxxxxxx.html`。

```yml _config.yml
skip_render:
  - static/**/*
```

站点验证成功后还需要添加一下sitemap，这样谷歌可以知道需要抓取的子页面有哪些。若安装了上文的sitemap插件，可在ng添加如下配置，访问`https://your.domain.com/sitemap`时即可直接重定向到`https://your.domain.com/sitemap.xml`

```conf
...
location / {
  try_files $uri $uri/ /index.html;
}

location = /sitemap {
  return 301 /sitemap.xml;
}
```

然后在谷歌控制台中找到并打开“站点地图”菜单栏，在“添加新的站点地图”中输入`sitemap`，点击提交即可。

## 四、开启站内评论

这里选用[twikoo](https://twikoo.js.org/)作为站内评论组件 (需要next主题`8.x`版本支持)

先在服务器上启动服务，访问ip:port若看到输出`Twikoo 云函数运行正常，请参考 https://twikoo.js.org/frontend.html 完成前端的配置` 则为启动成功了

```bash
docker run -d \
  --name twikoo \
  -e TZ=Asia/Shanghai \
  -e TWIKOO_THROTTLE=10 \
  -v /home/twikoo/data:/app/data \
  -p 8080:8080 \
  --restart=always \
  imaegoo/twikoo
```

为了避免跨域，这里用nginx把twitoo代理转发到跟博客同域名下，在nginx博客配置部分添加如下内容

```conf
...
location / {
  try_files $uri $uri/ /index.html;
}

# 👇 添加 Twikoo 的反向代理配置
location /twikoo/ {
  proxy_pass http://127.0.0.1:8080/; # 修改为twikoo服务的端口
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

然后在博客根目录执行`npm i hexo-next-twikoo`安装twikoo组件，在next配置文件中添加如下配置，重新打包部署后访问博客页面应该就能看到站内评论组件了

```yml _config.next.yml
# Multiple Comment System Support
comments:
  # Available values: tabs | buttons
  style: tabs
  # Choose a comment system to be displayed by default.
  # Available values: disqus | disqusjs | changyan | livere | gitalk | utterances
  active: disqus
  # Setting `true` means remembering the comment system selected by the visitor.
  storage: true
  # Lazyload all comment systems.
  lazyload: false
  # Modify texts or order for any naves, here are some examples.
  nav:
    twikoo:
      order: -1
      text: Twikoo 评论
    disqus:
     text: Load Disqus
     order: -1
    #gitalk:
    #  order: -2

twikoo:
  enable: true
  envId: https://your.domain.com/twikoo  # 或 http://ip:port，改成你自己的地址
  region: ''
  path: window.location.pathname
  visitor: true
  commentCount: true
```

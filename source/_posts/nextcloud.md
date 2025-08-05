---
title: 使用Nextcloud搭建多人协作文档系统
date: 2025-07-29 10:02:50
tags:
  - Nextcloud
  - OnlyOffice
  - 网盘
  - 多人协作文档
categories:
  - 技术笔记
---

## 背景

开发中的内网项目，近期要进入用户测试阶段了，为了方便用户提交bug，领导让我用 Nextcloud + OnlyOffice Document Server + OnlyOffice插件 搭建一个内网多人协作文档系统 ~~*(其实私有化部署个禅道之类的系统肯定比多人excel文档更好)*~~。

经过一番研究，梳理出了三者间关系。Nextcloud即个人网盘，OnlyOffice插件实现在网页中编辑网盘中的文件，OnlyOffice Document Server实现多人协作编辑文件。

>全文假设安装机子的ip为`10.96.38.201`，需要根据实际情况修改

## 安装与使用

### 前置环境需求

能装最新的docker以及docker compose就装最新的，至少也要如下版本

```bash
docker -v
Docker version 24.0.7, build afdd53b
docker-compose -v
docker-compose version 1.29.1, build c34c88b2
```

### 安装Nextcloud以及OnlyOffice Document Server

推荐使用docker-compose统一安装，使用镜像`nextcloud:stable`、`186184848/documentserver`，以及数据库`mariadb:10.11.13`，数据库推荐挂载卷到宿主机以实现数据持久化保存。
>`186184848/documentserver`镜像为社区版源码编译 移除人数限制 移动端编辑 多核心 中文字体，推荐使用

创建`docker-compose.yml`文件，cd到文件所在目录执行`docker-compose up -d`，查看容器运行状态。若启动成功，访问<http://10.96.38.201:9997>应该要看到ONLYOFFICE文档页面，访问<http://10.96.38.201:9995>应该要看到nextcloud管理员配置页面。

```yml docker-compose.yml
version: '3'

services:
  db:
    image: mariadb:10.11.13
    container_name: nextcloud-db
    restart: always
    cap_add:
      - SYS_TIME
    security_opt:
      - seccomp=unconfined
    environment:
      - MYSQL_ROOT_PASSWORD=YOURPWD
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=YOURPWD
    volumes:
      - /home/nextcloud/db:/var/lib/mysql
    networks:
      - office-net

  nextcloud:
    image: nextcloud:stable
    container_name: nextcloud
    restart: always
    depends_on:
      - db
    ports:
      - "9995:80"
    environment:
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=YOURPWD
      - MYSQL_HOST=db
    volumes:
      - nextcloud-data:/var/www/html
    networks:
      - office-net

  onlyoffice:
    image: 186184848/documentserver
    container_name: onlyoffice
    restart: always
    ports:
      - "9997:80"
      - "9998:8000"
    environment:
      - JWT_ENABLED=false
    networks:
      - office-net
    security_opt:
      - seccomp=unconfined

volumes:
  nextcloud-data:
  db-data:

networks:
  office-net:
```

### 安装配置Nextcloud OnlyOffice插件

访问 <https://apps.nextcloud.com/apps/onlyoffice> 根据安装的nextcloud版本下载对应的插件版本并解压。

在宿主机中执行`docker cp ./onlyoffice nextcloud:/var/www/html/apps`把解压好的插件拷贝到nextcloud插件文件夹中

再执行`docker exec -u www-data nextcloud php occ app:enable onlyoffice`启用插件

浏览器打开 [Nextcloud](http://10.96.38.201:9995/settings/admin/overview) → 管理 → ONLYOFFICE

按如下配置填写：

```text
# 使用服务名：
ONLYOFFICE Docs地址：http://onlyoffice/
服务器内部请求 ONLYOFFICE Docs 的地址：http://onlyoffice/
ONLYOFFICE Docs 内部请求服务器的地址：http://nextcloud/

# 若使用服务名的方式存在问题，也可以直接指定IP端口：
ONLYOFFICE Docs地址：http://10.96.38.201:9997/
服务器内部请求 ONLYOFFICE Docs 的地址：http://10.96.38.201:9997/
ONLYOFFICE Docs 内部请求服务器的地址：http://10.96.38.201:9995/
```

点击保存后看到如下内容即为配置成功，可以传一个文件验证试试，正常应该就可以在线编辑文档了

{% asset_img PixPin_2025-08-05_11-10-26.png 配置成功 %}

## 一些坑

### 1. 域解析问题

若访问nextcloud有问题，需要查看nextcloud容器内的`/var/www/html/config/config.php`文件中的`trusted_domains`配置部分，域名端口要添加上部署机器的ip，比如：

```php
  'trusted_domains' => 
  array (
    0 => '10.96.38.201:9995',
  ),
```

推荐直接在容器内执行`yum install vim`安装vim，方便编辑配置文件

若内网机子不方便安装vim，只能拷贝到宿主机编辑后再拷贝回去，需要执行下面几个操作，保证拷贝回容器后的config.php文件属于www-data用户

```bash
docker cp nextcloud:/var/www/html/config/config.php ./config.php
# 编辑 config.php...
docker cp ./config.php nextcloud:/var/www/html/config/config.php
docker exec -u root nextcloud chown www-data:www-data /var/www/html/config/config.php
docker exec -u root nextcloud chmod 640 /var/www/html/config/config.php
```

### 2.请求过多问题

运行一段时间后，通过分享链接匿名访问可能会遇到“请求过多 您的网络请求过多。如果出现错误，请稍后重试或与您的管理员联系。”的提示。
这个是nextcloud本身的限流机制，可以在config.php中添加配置关闭限流保护机制：

```php config.php
'auth.bruteforce.protection.enabled' => false,
```

并且执行`docker exec -u www-data nextcloud php occ security:reset-bruteforce-attempts`清除缓存

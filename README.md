# Gin

## 版本

使用官方 gin version 1.9.1

改造 `gin` 框架，使用自定义 `http` 服务。

## 框架实现流程：

### JS

将 `http` 请求序列化成字符串并用 Base64编码，通过 `tcp` 发送数据包。

### Go

改写官方 `http` 服务实现源码，接收 `tcp` 数据包并解码，将字符串反序列化成 `http` 请求对象，实现类似官方的 `http` 服务。

### 整体

http <=======> tcp client  <=======> tcp server <=======> http


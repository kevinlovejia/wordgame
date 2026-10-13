# 词境服务器

## 本机与局域网

```powershell
node server.js
```

服务监听 `0.0.0.0:3344`。同一 Wi-Fi 中的设备访问 `http://电脑IPv4地址:3344`，例如 `http://192.168.1.8:3344`。

## 两个客户端不在同一局域网

本机的 `192.168.x.x` 地址只能被局域网访问，必须给服务器一个公网 HTTPS 地址。最直接的临时方案是 Cloudflare Tunnel：

1. 保持 `node server.js` 运行。
2. 内网穿透使用cpoloar。
3. 另开 PowerShell 执行：

```powershell
cpolar http 3344
```





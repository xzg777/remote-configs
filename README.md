# Mihomo 自建订阅配置说明（第二版）

副标题：`minimal-clean-meta-clash.ini` + `mihomo-selfbuilt-override.js` 配套使用

这个仓库只用来保存三类文件：

- `README.md`
- `minimal-clean-meta-clash.ini`
- `mihomo-selfbuilt-override.js`
- `关于中间层部分的内容，仅提供思路，不提供代码仓库`

### 1. `minimal-clean-meta-clash.ini`文件说明

它的用途很单一：

**专门给 `SubConverter-Extended` 在生成 `Clash.Meta / Mihomo / Clash` 配置时，强制覆盖后端默认附带的那一大堆预设分流、策略组和规则。**

它不是给 `sing-box` 用的，也不是为了生成“纯节点列表”。

而是给中间层/sub前端拉取远程配置提供

### 2. `sing-box` 不应使用这份模板

`sing-box` 目标是尽量保持纯净的节点转换结果，不要额外加 `config`。

所以建议：

- `sing-box`：不加 `config`
- `clash-meta / clash`：由中间层强制加上这份模板的 raw 地址

### 3. 这份模板不会和客户端自主处理冲突

这份模板只做三件事：

- 覆盖后端默认预设
- 只保留一个 `PROXY` 选择组
- 只保留一条 `FINAL -> PROXY` 的兜底规则

也就是说，它会把后端原本复杂的默认分流压缩成一层非常薄的配置，让客户端端侧处理更加主导。

它不是“无规则”，但已经是“最小可运行规则”。

## 当前模板文件

文件名：

- `minimal-clean-meta-clash.ini`

内容：

```ini
[custom]
enable_rule_generator=true
overwrite_original_rules=true
custom_proxy_group=PROXY`select`[]DIRECT`.*
ruleset=PROXY,[]FINAL
```

含义：

- `overwrite_original_rules=true`
  - 覆盖后端默认预设规则
- `custom_proxy_group=PROXY\`select\`[]DIRECT\`.*`
  - 生成一个最小选择组 `PROXY`
  - 所有节点都进入 `PROXY`
  - 额外保留一个 `DIRECT` 选项
- `ruleset=PROXY,[]FINAL`
  - 把最终兜底规则指向 `PROXY`

### `mihomo-selfbuilt-override.js` 脚本说明

这个脚本是给自建节点订阅使用的通用覆写脚本，定位是在基础 `ini` 之上，继续补充全局增强、Sniffer 和 fake-ip DNS 相关配置。

它当前主要负责：

- 仅当订阅中命中 `SELF_NODES` 里的节点名时才生效，当前脚本内置的是 `云悠-香港` 和 `vmiss-美西`
- 写入 `profile.store-selected: true` 与 `profile.store-fake-ip: false`
- 固定 `geox-url` 下载地址，指向 `MetaCubeX/meta-rules-dat` 的 `geoip`、`geosite`、`mmdb` 和 `asn`
- 写入常用 DoH 域名的 `hosts` 映射，包含 `doh.pub`、`dns.google`、`dns.alidns.com`、`cloudflare-dns.com`
- 启用 `sniffer`，并对 `HTTP`、`TLS`、`QUIC` 端口做嗅探，其中 `HTTP` 开启 `override-destination`
- 启用一套默认的 `fake-ip` DNS 配置，监听 `0.0.0.0:5053`，禁用 `ipv6`，并补齐 `nameserver`、`fallback`、`direct-nameserver` 和 `fake-ip-filter`
- 将默认 DNS 配置与现有 `config.dns` 合并，保留原配置中已有的 `nameserver-policy` 与 `proxy-server-nameserver`

它当前默认不做这些事：

- 不新增策略组
- 不新增分流规则
- 不改写节点本身的协议细节
- 不写入 TUN 配置
- 不覆写外部控制器相关设置
- 不清空已有的 `nameserver-policy` 和 `proxy-server-nameserver`

该脚本定位为“自建订阅增强层”，建议与 `minimal-clean-meta-clash.ini` 配合使用：`ini` 负责基础配置清理与最小化收敛，`js` 负责全局增强、Sniffer 和 DNS 覆写。

## 整体调用关系

这个仓库只保存：

- `README.md`
- `minimal-clean-meta-clash.ini`
- `mihomo-selfbuilt-override.js`

它提供一个稳定的 raw 地址，例如：

```txt
https://raw.githubusercontent.com/用户名/仓库/main/minimal-clean-meta-clash.ini
```

如果文件放在子目录，例如 `remote-configs/`，那 raw 地址就应该写完整路径：

```txt
https://raw.githubusercontent.com/用户名/仓库/main/remote-configs/minimal-clean-meta-clash.ini
```

### `mihomo-selfbuilt-override.js` 使用流程

按 mihomo 系客户端的通用用法，这个脚本通常有两种接入方式：本地下载使用，或远程拉取使用。

#### 1. 本地下载使用

适合你希望自己手动管理脚本文件、随时本地修改的情况。

通用流程：

1. 从仓库中下载 `mihomo-selfbuilt-override.js`
2. 在客户端中找到与“覆写脚本”“脚本配置”“订阅脚本”或“远程配置脚本”含义相近的入口
3. 选择本地文件方式导入这个 `.js` 脚本
4. 将它绑定到你的 mihomo 订阅，更新订阅后让脚本随订阅一起执行

这种方式的特点是：

- 修改脚本后可以立即替换本地文件
- 不依赖外部 raw 地址可用性
- 更适合经常自己试规则、改分组的场景

#### 2. 远程拉取使用

适合你希望多端统一、后续只维护仓库文件的情况。

如果脚本放在仓库根目录，raw 地址示例：

```txt
https://raw.githubusercontent.com/用户名/仓库/main/mihomo-selfbuilt-override.js
```

如果脚本放在 `remote-configs/` 子目录，raw 地址示例：

```txt
https://raw.githubusercontent.com/用户名/仓库/main/remote-configs/mihomo-selfbuilt-override.js
```

通用流程：

1. 在客户端中找到与“远程脚本 URL”“覆写脚本 URL”“脚本地址”含义相近的入口
2. 填入该脚本的 raw 地址
3. 将脚本与目标 mihomo 订阅关联
4. 更新订阅或重新拉取配置，使客户端先获取订阅，再执行这份脚本

这种方式的特点是：

- 仓库中的脚本更新后，多端可同步使用
- 不需要逐台替换本地文件
- 更适合长期维护统一配置

#### 3. 搭配方式说明

这份脚本不是单独替代 `ini` 使用，而是和 `minimal-clean-meta-clash.ini` 配合使用：

- `ini` 用于收敛后端默认预设，保留最小基础结构
- `js` 用于在客户端侧继续补充全局增强、Sniffer 和 DNS 覆写

通用理解可以记成一句话：先用 `ini` 把后端配置变干净，再用 `js` 给自建订阅补上运行层和 DNS 层的增强逻辑。

### `minimal-clean-meta-clash.ini` 使用流程

### 1. 参考上面的raw地址实例

### 2. Cloudflare Worker 中间层

Worker 的职责：

1. 校验访问令牌
2. 从 GitHub 私有仓库拉取原始 `nodes.txt`
3. 调用 `SubConverter-Extended`
4. 对指定客户端强制注入远程配置 raw 地址
5. 返回最终订阅结果

## 推荐的最终行为

### 纯净模式

用于 `sing-box`：

```txt
https://你的worker域名/sing-box/你的ACCESS_TOKEN
```

不加 `config`。

### 强制覆盖模式

用于 `clash-meta / clash`：

```txt
https://你的worker域名/clash-meta/你的ACCESS_TOKEN
https://你的worker域名/clash/你的ACCESS_TOKEN
```

这些链接本身不需要显式带 `config=`，因为中间层会自动根据环境变量把 raw 地址注入给后端。

## 中间层环境变量怎么配

在 Cloudflare Worker 的环境变量里配置：

### 必需项

```txt
ACCESS_TOKEN=你的访问密钥
GITHUB_TOKEN=你的GitHub私库Token
GITHUB_REPO=用户名/仓库名
SUB_API=https://你的SubConverter-Extended接口地址
```

### 常用项

```txt
GITHUB_BRANCH=main
GITHUB_FILE_PATH=nodes.txt
CACHE_TTL_SECONDS=60
GITHUB_TIMEOUT_MS=8000
SUB_TIMEOUT_MS=15000
```

### 强制覆盖相关

最常见只需要这一个：

```txt
MIHOMO_CONFIG_URL=https://raw.githubusercontent.com/你的用户名/你的仓库/main/minimal-clean-meta-clash.ini
```

如果你想给传统 `clash` 单独一份模板，再额外设置：

```txt
CLASH_CONFIG_URL=https://raw.githubusercontent.com/你的用户名/你的仓库/main/另一份.ini
```

如果没有单独设置 `CLASH_CONFIG_URL`，当前中间层会自动回退使用 `MIHOMO_CONFIG_URL`。

## 当前中间层中的强制覆盖规则

当前 Worker 已经支持：

- `/clash-meta/{token}`
- `/clash/{token}`

规则如下：

### `clash-meta`

优先读取：

1. `MIHOMO_CONFIG_URL`
2. `CLASH_CONFIG_URL`

### `clash`

优先读取：

1. `CLASH_CONFIG_URL`
2. `MIHOMO_CONFIG_URL`

### `sing-box`

不使用任何远程配置覆盖。

## ini 修改后，raw 地址要不要变

分两种情况：

### 情况一：你用的是分支 raw 地址

例如：

```txt
https://raw.githubusercontent.com/你的用户名/你的仓库/main/minimal-clean-meta-clash.ini
```

这种情况下，只要你没有改：

- 仓库名
- 分支名
- 文件名
- 文件所在目录

那么：

**你以后只改 ini 内容并提交，raw 地址通常不用改。**

### 情况二：你用的是 commit 固定地址

这种情况下每次文件内容更新后，URL 都需要换。

一般不建议你现在这么做，因为维护成本更高。

## 推荐操作流程

### 第一步：确认公开仓库中的文件路径

例如你仓库里就是：

```txt
README.md
minimal-clean-meta-clash.ini
```

那么 raw 地址就是：

```txt
https://raw.githubusercontent.com/你的用户名/你的仓库/main/minimal-clean-meta-clash.ini
```

### 第二步：在 Cloudflare Worker 中配置变量

至少填入：

```txt
ACCESS_TOKEN
GITHUB_TOKEN
GITHUB_REPO
SUB_API
MIHOMO_CONFIG_URL
```

### 第三步：部署或重新部署 Worker

部署后中间层就会对：

- `clash-meta`
- `clash`

自动按规则注入模板。

### 第四步：实际测试

建议至少测试这三条：

```txt
https://你的worker域名/clash-meta/你的ACCESS_TOKEN
https://你的worker域名/clash/你的ACCESS_TOKEN
https://你的worker域名/sing-box/你的ACCESS_TOKEN
```

检查点：

- `clash-meta` 输出中，不再带后端那一堆复杂默认分流
- `clash` 输出可按需要复用同一模板
- `sing-box` 输出仍然保持纯净
- 修改 ini 后再次请求，结果会随之更新

## 还有没有必须优化的地方

按当前目标来看，没有额外必须做的结构性改动了。

现在这套最关键的部分已经齐了：

- 独立公开配置仓库
- Worker 强制覆盖 `clash-meta / clash`
- `sing-box` 保持纯净
- raw 地址单独维护





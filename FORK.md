# DSH Loomy Connect — 0.2.1 适配分支

本仓库是 [gdrpzym/dsh-loomy-connect](https://github.com/gdrpzym/dsh-loomy-connect) 的派生版本，目标是把插件适配到 **DeepSeek Harness 0.2.1**（当前 npm `latest` 为 `0.2.1-rc.2`）。

- 上游基线：`dsh-loomy-connect@0.2.0`（2026-09-12）
- 本分支版本：**0.3.0**
- 兼容范围：DSH `>=0.2.1-rc.2 <0.3.0`，Node `>=22.19`
- 许可：沿用上游 **MIT**，原始版权归 `gdrpzym` 所有；本分支改动同样以 MIT 发布。

## 改了什么

| 层面 | 上游（0.1.5） | 本分支（0.2.1） |
|---|---|---|
| 安装门禁 | 只有 `^0.1.5-rc.x` peers | 声明 `engines.dsh`，peers 全部对齐 0.2.1 |
| 配置命名空间 | `settings.installSection(...)` 注册 | 删除该调用；配置项标记 `.volatile()`，命名空间取 loader entry id |
| 配置读取 | 通过 settings `setSource` thunk | 直接读 volatile 引用，兼容 `.get()` 形态；监听 `loader/volatile-update` |
| 插件配置卡片 | `settings.plugin.item` | `plugins.bundle.config`（完整面板） |
| 路径覆盖 | 自动生成表单 | `plugins.row.config`（可保存的 `authFile`/`configFile`） |
| 模型页 | 无 | `settings.models.provider-card` 精简状态条 |
| 文案/图标 | 仅运行时 locale | 增加 `./locale/*.json` 与 `./icon` 资源子路径 |

功能逻辑（回环网关、Loomy 登录态解析、模型目录、积分读取、HTTP 状态路由）保持不变。

## 安装

```bash
dsh plugin --profile web add /绝对路径/dsh-loomy-connect
dsh web
```

要求本机已安装 Loomy 桌面应用并至少登录过一次。

## 已知限制

- 沙箱/CI 中没有 Loomy 桌面端，因此只能验证未登录态、fallback 模型目录与错误分支；真实账号与积分需要在装有 Loomy 的机器上复核。
- 仍然依赖 Loomy 客户端的非公开接口，Loomy 更新后可能需要调整。
- 不包含上游 issue #1 提到的 OAuth/云端登录能力。

## 上游

上游项目与 Loomy、讯飞、DeepSeek 均无关联，未获其授权或认可。本分支同样不代表任何官方立场。

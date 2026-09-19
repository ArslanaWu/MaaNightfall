# GUI 选型

选择 [MFAAvalonia](https://github.com/MaaXYZ/MFAAvalonia)。

MaaFramework 官方将其列为通用 GUI。它提供 Windows x64/arm64、macOS x64/arm64 和 Linux 发布目标，支持 Project Interface V2、自定义 Agent、任务选项和命令行自动执行，并支持通过 GitHub 检查及安装程序与资源更新。对本项目而言，已有 Pipeline 和 Node Agent 可以继续使用。

本阶段完成选型，仍使用现有命令行菜单。后续将自定义体力计划列表与 Windows GUI 一起开发，先不适配 macOS。11 种日常关卡已从用户录像确认，后续列表支持关卡、次数、顺序和剩余体力选项。

集成约定：
- 游戏任务和计划数据保持独立，不绑定 Windows 窗口代码；模拟器启动与 Agent 入口单独做平台适配。
- GUI 对接 Project Interface V2。可变长度体力计划需要列表编辑与验证，不能只把次数硬编码到 Pipeline。
- GitHub 更新需要版本号和完整 Release 资源包；仅推送源码并不会生成更新包。
- 发布包须包含 Node Agent 所需脚本与运行库；当前启动脚本的运行库更新继续保留。
- 更新保留 config/、.state/，尤其是每周次数和 15 天周期记录。
- 按当前官方说明，GUI 官方包需要 .NET 10 Runtime；打包时明确安装或随包提供的方案。
- 先验证 Windows 的启动、更新回滚和每日串行调用，再做 macOS 模拟器及权限适配。

参考：[MaaFramework 官方 GUI 列表](https://github.com/MaaXYZ/MaaFramework#通用-ui)、[MFAAvalonia 功能与集成说明](https://github.com/MaaXYZ/MFAAvalonia#readme)。另一候选 [MXU](https://github.com/MistEO/MXU) 使用 Tauri 2 + React；本项目优先采用 MFAAvalonia 现有的任务与更新能力。


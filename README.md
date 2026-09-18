# MaaYMZX

基于 [MaaFramework](https://github.com/MaaXYZ/MaaFramework) 的《夜幕之下》日常自动化工具，支持按模块勾选执行，以及回车一键运行全部模块。

目前主要适配 **Windows + MuMu 12 + 官服**。首次启动会自动安装运行库和 OCR 模型。

## 环境准备

- Windows 10/11 x64、Git（下载源码 ZIP 时无需 Git）。首次安装需联网。
- MuMu 12，已安装游戏并完成账号登录。游戏包名为 `com.bmystu.peng.gw`。
- 模拟器分辨率设为 `900×1600`、DPI `320`，游戏横屏画面为 `1600×900`。识别时由 MaaFramework 缩放为短边 720。
- MuMu 连接由 MaaFramework 自动发现，不要求安装在默认目录。
- 简报战斗使用已有队伍和自动战斗设置，请提前配置队伍并开启自动战斗。

### 新电脑首次运行

克隆仓库（或下载并解压源码 ZIP）后，启动 MuMu 并登录游戏，双击 run_daily.cmd。无需预装 Node.js、npm、Python 或开发工具。

启动脚本会自动安装便携版 Node.js 22、最新稳定版 MaaFramework 和 OCR 模型，然后进入默认全选的模块菜单。运行库安装在本项目 runtimes/，OCR 安装在 assets/resource/model/ocr/，不需要管理员权限。首次下载可能需要几分钟；网络必须能访问 nodejs.org、registry.npmjs.org 和 download.maafw.xyz。

只完成安装或更新，不启动游戏任务：

```bat
update_runtime.cmd
```

无人值守调用（没有暂停提示）：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/update_runtime.ps1
```

### 自动更新规则

- 每次通过 run_daily.cmd 启动都会在线检查 Node.js 22 最新补丁和 MaaFramework 最新稳定版；不会自动安装 alpha、beta、rc。
- 更新先在临时目录下载和检查，验证 OCR 资源及 Agent 可加载后再替换；替换后的验证失败会恢复旧版。
- 下载失败或断网时，启动流程会验证并继续使用本项目已有的可用运行库；首次安装没有可用运行库时会提示失败，联网后重新运行即可。手动更新失败返回非零状态。
- OCR 使用固定的 ppocr_v6-small 模型，仅在缺失或不完整时补齐。不会每次重新下载模型。
- 更新仅管理运行库与模型，不修改游戏任务脚本、兑换白名单和 .state/ 中的账号周限记录。更新项目代码仍使用 git pull。
- 源码和发行包共用 runtimes/node/node.exe、runtimes/maa/node_modules/ 目录。直接运行 Node 脚本会跳过自动安装和更新；通用 UI 的 Agent 使用已安装运行库，首次使用前运行 update_runtime.cmd。

开发工具依赖仅在修改代码时需要，可执行 runtimes\node\npm.cmd ci 安装。运行日常不需要安装这些开发依赖。

## 使用方式

启动 MuMu，在终端运行或双击：

```bat
run_daily.cmd
```

菜单默认全部勾选：

- **↑ / ↓**：移动光标。
- **空格**：勾选或取消当前模块。
- **回车**：执行所选模块；保持默认即可一键执行全部。
- **Esc / Ctrl+C**：在菜单中取消，不操作游戏。

模块按下表顺序执行，不受选择先后顺序影响：

| 顺序 | 模块 | 命令行名称 |
| --- | --- | --- |
| 1 | 启动游戏、关闭公告和活动弹窗 | `start` |
| 2 | 每日免费饮品，两杯分别检查 | `drinks` |
| 3 | 好友赠礼 | `friends` |
| 4 | 古堡回声扫荡，清理体力 | `stamina` |
| 5 | 据点产物、生产和订单 | `base` |
| 6 | 秘密派遣领取与指派 | `dispatch` |
| 7 | 巡夜简报 | `briefing` |
| 8 | 首领印象属性激活 | `impression` |
| 9 | 每日 / 每周任务奖励 | `rewards` |
| 10 | 通行证任务进度与奖励 | `pass` |
| 11 | 商店免费礼包 | `shop` |
| 12 | 指定商店兑换 | `exchange` |
| 13 | 罪恶博弈，每周最多两次 | `poker` |
| 14 | 关闭游戏 | `close` |

未选“启动游戏”时，请先将游戏停在主界面。未选“关闭游戏”时，普通流程完成后保持游戏开启。**罪恶博弈匹配成功后会立即关闭游戏**，因此安排在工作模块最后；每次运行最多匹配一局。

也可以跳过菜单指定模块：

```bat
run_daily.cmd start friends pass close
run_daily.cmd 1 3 10 14
run_daily.cmd all
```

### 连接检查与日志

```bat
run_daily.cmd --check
run_daily.cmd --probe
```

`--check` 只检查运行库和资源；`--probe` 额外检查模拟器连接，不执行游戏任务。Node 主流程通过 MuMuManager 自动发现运行中的 MuMu 实例，启动未就绪时最多等待约 60 秒。

日志和失败截图写入 `debug/`。执行失败会停止任务并尝试关闭游戏；PowerShell 兜底关闭逻辑使用 `127.0.0.1:16384`，非默认实例需同时核对 `tools/run_daily.ps1` 中的地址。

## 领取与兑换规则

- 饮品只点击“领取”或“免费补领”，付费补领跳过。
- 商店礼包必须同时核对商品名称、列表中的“免费”和详情中的“免费领取”；售罄或不能确认免费时跳过。
- 商店兑换只允许 [兑换白名单](assets/exchange_whitelist.json)中的物品及周限档位。使用游戏的“最大”按钮，再检查名称、数量、总价和余额；余额不足或售罄时跳过，不自动换成其他商品。
- 巡夜简报支持普通选择、据点事件、会面及战斗分支；会面点击角色后返回。奖励后的属性升级弹窗不限定属性名称，点击底部空白关闭。
- 简报战斗仅在入场消耗显示为 0 时进入。战斗失败或超时停止，不自动重试。
- 通行证分别处理任务和奖励页，不购买等级或解锁付费奖励。

## 每周次数记录

任务限额及刷新时间配置在 [task_policies.json](assets/task_policies.json)，默认北京时间周一 05:00 刷新。记录按游戏 UID 保存到本地 `.state/weekly.json`，重启不会清零。

```bat
runtimes\node\node.exe tools/task_state.mjs status
runtimes\node\node.exe tools/task_state.mjs set 你的UID poker 本周已完成次数
```

首次使用前，如果本周已经手动参与罪恶博弈，请先校准次数。开始匹配会预留次数，确认对手后记账并关闭游戏；异常中断遗留的 pending 记录会阻止再次匹配，需要核实实际情况后校准。**不要通过删除 .state 来清理缓存**，否则可能重复执行周限任务。

## 开发与验证

| 路径 | 用途 |
| --- | --- |
| `tools/modules.mjs` | 模块定义、顺序和执行衔接 |
| `tools/module_menu.mjs` | 键盘勾选菜单 |
| `tools/custom_actions.mjs` | 兑换、周限等自定义动作 |
| `tools/weekly_ledger.mjs` | 按账号保存周限记录 |
| `assets/resource/pipeline/` | 各模块识别与操作流程 |
| `assets/resource/image/` | 必须提交的识别模板图片 |
| `assets/interface.json` | 通用界面及 Node Agent 配置 |
| `deps/tools/` | 提交到仓库的 JSON Schema |

无需连接游戏的基础测试：

```bat
runtimes\node\node.exe tools/test_runtime.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test_runtime_update.ps1
runtimes\node\node.exe tools/test_module_menu.mjs
runtimes\node\node.exe tools/test_modules.mjs
runtimes\node\node.exe tools/test_weekly_exchange.mjs
```

录像回归的素材准备和命令见 [回归测试说明](docs/testing.md)。原始视频、账号截图、抽帧和日志只保存在本地，不随仓库发布。

现有 `.github/workflows/install.yml` 和 `tools/install.py` 继承自项目模板，尚未完整包含本项目 Node Agent 所需脚本和配置。当前请按上述源码方式运行；发布可下载的发行包前，还需要完善打包流程并验证成品。通用界面入口通过 PowerShell 启动 Agent，同样优先使用包内 Node.js 和 Maa Node 运行库。

## 当前限制

当前适配以录制视频中的 UI 布局为准；其他分辨率、服务器和模拟器尚未验证。据点第二种产物气泡暂未处理，简报战斗不支持手动布阵或失败重试。已领取、售罄等操作无法重复实测，部分分支通过录像和模拟控制器验证。

提交问题时请附带相关日志、模块名称和截图，并遮盖 UID 等账号信息。

## 许可证与致谢

代码采用 [MIT License](LICENSE)，保留模板原有版权声明。项目基于 MaaFramework 和 MaaPracticeBoilerplate；游戏画面、名称和素材归各自权利人所有。本项目为非官方工具。

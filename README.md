# MaaYMZX

基于 [MaaFramework](https://github.com/MaaXYZ/MaaFramework) 的《夜幕之下》日常任务自动化项目。

当前版本针对 MuMu 模拟器、`1600×900` 横屏画面（模拟器设置为 `900×1600`）、DPI `320` 制作。MaaFramework 会把截图短边缩放到 720 后执行识别。

## 已实现流程

1. 启动游戏并关闭公告、活动弹窗；更新后出现“请重启游戏”时会确认并自动重新启动。
2. 领取每日饮品的中午、下午饮品：时段内识别“领取”，错过时段仅识别“免费补领”；已领取或需要付费时跳过。商店仍必须明确标注“免费”。
3. 进入家族遗迹的“古堡回声”，使用最大可用次数扫荡清理体力。
4. 据点一键领取产物、再次生产；处理特供订单和专项订单，显示“提交”时提交，显示“前往”时刷新。
5. 秘密派遣一键领取、两次一键指派，并关闭传闻弹窗。
6. 处理五条巡夜简报：普通选项、据点事件、“会面”及战斗分支。会面时点击角色，关闭奖励/展示层后返回简报；战斗使用当前队伍，只有入场消耗显示 0 才开始，胜利后关闭结算并返回。
7. 领取日常/周常任务及累计奖励；可连续处理“一键领取 → 进度更新 → 再次一键领取 → 奖励遮罩”，按钮消失或失效后退出。
8. 通行证（奥默塔影业）依次领取每日、每周、活动任务进度和奖励，不点击提升进度或解锁银幕特供。
9. 商城礼包的“超值推荐 → 每日赠礼”和“契约特供 → 遴选每日赠礼”。列表价格必须精确识别为“免费”，详情按钮必须精确识别为“免费领取”，同时核对商品名称；售罄跳过，未识别出免费确认时关闭详情。
10. 返回主界面；按是否选中“关闭游戏”决定是否退出游戏。

饮品安排在清理体力前，任务奖励和通行证安排在其他日常完成后。简报战斗沿用游戏已保存的队伍、自动战斗和倍速设置，请先在游戏中开启自动战斗。失败或等待超时会终止任务，不自动重试战斗。

## 模拟器和 ADB

- Android 包名：`com.bmystu.peng.gw`
- 默认 MuMu ADB 地址：`127.0.0.1:16384`
- MuMu ADB 程序：`C:\Program Files\Netease\MuMu\nx_main\adb.exe`

如果 CMD 提示 `'adb' 不是内部或外部命令`，无需修改系统环境变量，直接运行完整路径：

```bat
"C:\Program Files\Netease\MuMu\nx_main\adb.exe" connect 127.0.0.1:16384
"C:\Program Files\Netease\MuMu\nx_main\adb.exe" devices -l
```

连接成功后，在通用 UI 中选择 MuMu 模拟器和 `127.0.0.1:16384`，然后运行“一键日常”。

## 命令行执行

先启动 MuMu 12，并将游戏保持在已登录状态。然后在本项目目录的 CMD 中执行：

```bat
run_daily.cmd
```

脚本会显示可用方向键操作的勾选菜单，默认全部选中：

1. 启动游戏（start）
2. 每日免费饮品（drinks）
3. 好友赠礼（friends）
4. 清理体力（stamina）
5. 据点产物与订单（base）
6. 秘密派遣（dispatch）
7. 巡夜简报（briefing）
8. 首领印象属性激活（impression）
9. 每日/每周奖励（rewards）
10. 通行证任务与奖励（pass）
11. 商店免费礼包（shop）
12. 指定商店兑换（exchange）
13. 罪恶博弈（每周两次，匹配后关闭游戏）（poker）
14. 关闭游戏（close）

使用 ↑↓ 移动光标，空格切换当前模块的勾选状态，回车执行勾选项。默认全部选中，直接回车一键执行全部。Esc 或 Ctrl+C 取消，不操作游戏。全部取消勾选时不会启动，需至少选择一项。

命令行示例：

    run_daily.cmd all
    run_daily.cmd 1 3 10 14
    run_daily.cmd start friends pass close

不选启动游戏时，请先停在主界面；不选关闭游戏时，完成后保持开启。罪恶博弈匹配成功后会立即关闭游戏，仍放在所有工作模块最后。

命令行参数仍支持英文模块名或序号，例如 run_daily.cmd start friends pass close。实际执行始终按菜单顺序，模块定义集中在 tools/modules.mjs。通用界面的现有一键日常入口保持原样。

首次实际运行前，可以只测试运行库和模拟器连接，不操作游戏：

```bat
run_daily.cmd --probe
```

脚本会通过 `MuMuManager` 自动发现正在运行的实例，使用 MuMu 返回的 ADB 路径、端口和实例配置连接，不再依赖写死的端口。刚启动模拟器时若尚未就绪，脚本会自动等待最多 60 秒；不会再重启全局 ADB daemon，因此也不会干扰其他正在运行的 MAA 项目。

只检查 MaaFramework 运行库和资源能否加载：

```bat
run_daily.cmd --check
```

脚本会使用 MuMu 自带的 ADB。正常完成时是否关闭游戏由“关闭游戏”模块决定；执行失败时仍会停止任务并关闭游戏。运行日志位于 `debug\maafw.log`。

## 开发目录

- `assets/interface.json`：通用 UI 项目、控制器和任务入口。
- `assets/resource/pipeline/`：各功能的流水线逻辑。
- `assets/resource/image/`：由无损 720p 游戏画面裁剪的识别模板。
- `assets/resource/model/ocr/`：本地 OCR 模型；该目录不会提交到仓库。

调试前需要安装项目依赖、下载 MaaFramework，并准备 PaddleOCR 模型。模板附带的开发说明位于 `docs/zh_cn/develop/how_to_develop.md`。

本目录已经是 Git 仓库，视频、模型、日志与本地分析产物由 `.gitignore` 排除。公共资源子模块可按需要初始化：

```bash
git submodule update --init --recursive
```

## 当前限制

- 只适配了录制视频对应的 UI 布局和分辨率。
- 据点的第二种产物气泡暂未处理。
- 简报战斗需要预先配置合适队伍并开启游戏自动战斗；暂不处理付费入场、手动布阵或失败重试。
- 正式使用前应在测试账号上完成一次全流程回放，根据实际 OCR 日志微调识别区域。

## 视频回归校验

2026-09-18 新功能对应工作区的《夜幕之下 最新.mp4》和《夜幕之下 周常.mp4》。已完成离线录像识别和流程回放，并于当天实机分段执行饮品、扫荡、据点、派遣、简报（含会面）、每日/每周奖励、通行证和商店免费礼包。简报战斗分支当天未触发，使用录像回放验证。

先用 FFmpeg 将两段录像按 `fps=2,scale=1280:720` 抽帧到 `.analysis/new-videos/latest-%03d.png` 和 `weekly-%03d.png`，再运行：

```bat
node tools/test_video_recognition.mjs
node tools/test_video_replay.mjs
run_daily.cmd --check
```

测试只使用本地截图与模拟控制器，不连接或点击真实游戏。可通过脚本第一个参数指定其他抽帧目录。

## 首登实机修复（2026-09-18）

- 饮品支持时段内的“领取”和特权免费补领，两杯分别检查；商店仍只领取明确标注免费的商品。
- 扫荡等待“扫荡完成”，依次关闭扫荡明细及获得物品遮罩，确认回到关卡页后再返回。
- 简报奖励后的属性升级不限定铁腕或仁心，根据“提升/升级”和底部关闭提示识别，点击底部空白后回到原流程；覆盖普通、会面和战斗奖励路径。
- 业务入口增加有限重试，简报返回时等待界面动画结束；中途异常停止不再误报成功。
- 已验证 53 项视频识别、10 个流程回放，以及实机故障截图的 16 项识别检查。实机截图保留在本地 `.analysis/live/` 和 `debug/on_error/`，不提交账号画面。

## 补充视频功能（2026-09-18）

全部功能均已纳入上方的 14 项模块菜单；all 包含全部模块，罪恶博弈始终在工作模块最后执行。

- 通行证必须确认奖励页内容才领取或返回；点击落空会重试。
- 兑换白名单见 assets/exchange_whitelist.json。特供商店仅四种晋升许可Ⅱ、七种灵感Ⅱ、周限 50 次的作战报告；家族仅欲望特调Ⅱ、七种灵感Ⅱ、周限 10 次的作战报告。使用游戏的最大按钮，再核对名称、周限档位、数量、总价和余额。售罄和余额不足的跳过，不兑换图纸、金币或同名高价常驻商品。
- 博弈每次运行最多匹配一局，每周最多两局。看到对手 VS 画面后保存次数并立即关闭游戏，即使没有选择 close；匹配中不会提前退出。本周已按用户确认记录为两次。
- 每周记录按 UID 存在 .state/weekly.json，重启不清零，不进 Git。开始匹配时预留次数，确认对手后记账；意外中断遗留的 pending 会阻止重复匹配，确认实际状态后再校准。
- assets/task_policies.json 集中配置任务限额及刷新时间，默认北京时间周一 05:00，可按服务器规则调整。新周限任务可复用 tools/weekly_ledger.mjs。手动参与后应校准次数，不要删除记录。
- 通用 Project Interface 配置了 Node Agent，与命令行复用兑换和周限动作；需要 PATH 中的 Node.js 和已安装的 Maa Node 运行库。

运行示例：run_daily.cmd start friends impression pass exchange poker

查看周限记录：node tools/task_state.mjs status
校准已完成次数：node tools/task_state.mjs set 你的UID poker 本周已完成次数

三个补充视频按 fps=1,scale=1280:720 抽帧到 .analysis/extra-videos/v6-%03d.png、v8-%03d.png、v10-%03d.png。验证脚本：

- node tools/test_extra_recognition.mjs
- node tools/test_extra_replay.mjs
- node tools/test_extra_actions.mjs
- node tools/test_weekly_exchange.mjs

实机已验证通行证奖励领取（26 级 30000 金币）、好友已领满跳过、两种印象已激活跳过、兑换售罄跳过及本周博弈满两次跳过。今天无法重复的领取、属性激活、兑换和匹配成功退出采用录像回放验证；不足余额采用模拟控制器验证。没有额外实机匹配。

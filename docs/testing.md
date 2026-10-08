# 回归测试

## 2026-10-09 派遣免费刷新

- 从历史派遣截图 `.analysis/live/run-1789732966098/017_Dispatch_Assign.png` 提取任务卡片上的金币、经验书模板，未使用其他页面的参考图标。
- 仅刷新明确识别为 2 级且奖励为金币/经验书的未派遣任务。红色特殊任务通过卡片色条保护；5 级、3 级、信封、结晶和未知任务均先派遣，再允许刷新剩余目标。保护任务无法派出时跳过刷新。
- 每次刷新前从最新截图精确读取“免费刷新：剩余/上限”，要求剩余次数大于 0；点击一次后必须确认免费次数恰好减少 1。付费字样、识别失败、次数耗尽、次数变化异常均不继续刷新。
- `tools/test_dispatch_refresh.mjs` 覆盖保护任务先派出、刷新后再次筛选、5 级/3 级/特殊任务保护、免费额度每次重读、付费切换、无派遣次数和点击结果异常。
- `tools/test_dispatch_video.mjs` 用实际历史截图验证等级、金币、经验书，并用用户当前截图验证信封、结晶、红色任务不作为刷新目标。历史派遣前后截图回放四行指派；此段回放将免费额度设为 0，未点击真实游戏。免费刷新后的实际页面暂无素材，刷新成功与额度递减使用模拟测试。

```bat
runtimes\node\node.exe tools/test_dispatch_refresh.mjs
runtimes\node\node.exe tools/test_dispatch_video.mjs
```

## 2026-10-09 兑换、体力和据点

- 契约之刃加入特供与家族兑换列表首项，沿用列表顺序。特供录像确认单价 1000、每周 2 个；家族录像确认单价 500，用户补充每周 1 个。仍校验商品名、周额度、数量、总价与余额。
- GUI 与命令行默认先欲望酒会 X 3 次，再用当天同一种家族遗迹耗尽剩余体力；从上海日期 2026-10-09 开始，四天一轮，同一天重复运行不换种类。体力识别支持不同上限。
- 历史截图确认领取与巡逻按钮的动态位置，领取后巡逻惊喜会下移。扩大领取识别区域，通过文字定位点击；无这两项时直接处理订单，家族遗藏不点击。
- `tools/test_stamina_plan.mjs` 验证顺序、同日不切换、上海午夜边界、四天循环和失败保护；`tools/test_weekly_exchange.mjs` 验证新增价格与额度。
- `tools/test_contract_base_video.mjs` 使用本地 `.analysis/video14/frame-*.jpg`、`base-no-benefits.png` 和 `.analysis/live/run-1789732736872/` 的历史截图，回放真实契约之刃兑换及领取、巡逻、只有遗藏三种据点场景。巡逻奖励覆盖层使用通用获得物品截图模拟；未实际领取巡逻奖励或消耗游戏资源。
- 订单旧模拟用例的 DirectHit 提交节点补上测试点击目标；DirectHit 没有 OCR 框，当前运行库无法点击空框。生产流程未改动订单提交位置。

## 2026-09-29 更新适配

- 夜幕启动、点击进入及更新后重启的页面等待上限改为 180 秒。今日失败截图仍在加载画面，原 30 秒等待提前退出；实机延长等待后成功进入主界面。
- 实机完成免费饮品、好友赠礼、每日/每周奖励、通行证及商店免费礼包。此次未重复验证消耗体力、兑换及战斗模块。
- MaaYuan 上游 v5（核对至 `f278a1e168b64f28dd547bb40ddf74ae6dcc9a56`）的活动签到领取仍缺少 Click，且“领取”会匹配“已领取”。本地补丁只修改简中启动签到链路：精确识别可领取按钮、点击、确认奖励、识别签到页后关闭。修改前在原文件旁保存 `.bak` 备份。
- MaaYuan 实机启动已到达主界面；本次实机没有重新出现周年签到页，签到点击位置通过当天实际失败截图验证。

本地截图回归（需要保留当天失败截图和 `.analysis/nightfall-home-20260929.png`）：

```bat
runtimes\node\node.exe tools/test_startup_update.mjs "C:\Games\MaaYuan beta"
```

覆盖加载画面超过 30 秒后仍能进入主界面、周年签到页点击第四天可领取奖励而非前三天“已领取”、关闭按钮坐标。仅回放截图，不操作真实游戏。

如 MaaYuan 更新覆盖补丁，可先检查上游是否已修复，再使用 `tools/patch_maayuan_startup.mjs <MaaYuan安装目录>` 重新应用；脚本会保留其他任务并备份启动文件。

先运行 update_runtime.cmd 准备包内运行库。基础测试不连接模拟器，也不消耗游戏资源：

```bat
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test_runtime_update.ps1
runtimes\node\node.exe tools/test_runtime.mjs
runtimes\node\node.exe tools/test_module_menu.mjs
runtimes\node\node.exe tools/test_modules.mjs
runtimes\node\node.exe tools/test_weekly_exchange.mjs
```

检查 MaaFramework 和 OCR 资源：

```bat
runtimes\node\node.exe tools/run_daily.mjs --check
```

## 私有录像素材

录像回归使用开发时的固定视频和帧号，源码仓库不包含这些账号画面。任意其他录像不能直接替换并得到相同断言结果；没有对应素材时只运行上面的基础测试。

保留原始文件名时，可以用 FFmpeg 重新生成抽帧（先创建输出目录）：

```bat
ffmpeg -i "夜幕之下 最新.mp4" -vf "fps=2,scale=1280:720" .analysis/new-videos/latest-%%03d.png
ffmpeg -i "夜幕之下 周常.mp4" -vf "fps=2,scale=1280:720" .analysis/new-videos/weekly-%%03d.png
ffmpeg -i "夜幕之下(6).mp4" -vf "fps=1,scale=1280:720" .analysis/extra-videos/v6-%%03d.png
ffmpeg -i "夜幕之下(8).mp4" -vf "fps=1,scale=1280:720" .analysis/extra-videos/v8-%%03d.png
ffmpeg -i "夜幕之下(10).mp4" -vf "fps=1,scale=1280:720" .analysis/extra-videos/v10-%%03d.png
```

以上为批处理文件写法；直接在终端输入时将 `%%03d` 改为 `%03d`。

```bat
runtimes\node\node.exe tools/test_video_recognition.mjs
runtimes\node\node.exe tools/test_video_replay.mjs
runtimes\node\node.exe tools/test_extra_recognition.mjs
runtimes\node\node.exe tools/test_extra_replay.mjs
runtimes\node\node.exe tools/test_extra_actions.mjs
```

这些测试使用本地截图和模拟控制器。各脚本第一个参数可指定对应的抽帧目录。测试和运行生成的日志、失败截图不提交到 Git。

## 本地目录清理

可以定期清理 `debug/`、`maa-*/` 和日志。进行录像回归时保留 `.analysis/new-videos/`、`.analysis/extra-videos/`；历史故障截图保存在 `.analysis/live/`。

`.state/` 保存实际账号的每周次数和挑战周期，必须保留。OCR 模型、`node_modules/`、`.schema-deps/` 和 `.codex-tools/` 是本地运行或开发依赖，删除后需要重新安装。不要直接用 `git clean -fdX` 清空所有忽略文件。

## 缄默暗门与今日故障回归

```bat
runtimes\node\node.exe tools/test_challenge.mjs
```

覆盖从 01 关开始、自动组队、胜利继续、失败退出、超时、账号隔离、15 天边界、异常不记完成和并发锁。暂停截图只验证不会误判为失败，不主动操作暂停。

新录像按每秒一帧缩放到 1280×720，抽取为 .analysis/video11/frame-%03d.jpg 后：

```bat
runtimes\node\node.exe tools/test_challenge_video.mjs .analysis/video11 你的升级弹窗截图.png
```

测试使用用户录像及实际等级提升截图验证识别；素材和日志只保存在本地。可继续按顺序传入传闻弹窗、零体力战斗、事件奖励、胜利结算、满员组队和缺员组队截图，以覆盖相应故障回归。

## 2026-09-19 实机验证

- 修复扫荡后账号等级提升弹窗；用当天失败截图验证识别，后续实机扫荡正常结束。
- 修复传闻弹窗关闭位置；实机完成四行派遣。
- 巡夜简报零体力战斗入口、事件奖励覆盖层、动态胜利结算识别已覆盖截图回归；实机完成后续简报、印象、任务、通行证、免费商店和兑换检查。
- 缄默暗门实机从 01 关开始，点击自动组队并检查阵容；连续胜利两场后继续挑战，第三场失败后退出并返回主界面，记录周期完成。再次运行成功跳过。
- 商店兑换当天部分额度已用完或余额不足，验证了跳过分支；新的实际兑换未重复验证。暗门全部通关分支只做模拟测试，未实机通关。
- 自定义体力计划与 GUI 尚未实现；桌面 PC 游戏流程未修改。

## Windows GUI 与体力计划

基础测试：tools/test_gui.mjs、tools/test_stamina_plan.mjs、tools/test_gui_agent.mjs。后者启动本项目 Node Agent 检查 IPC，不操作游戏。覆盖默认模块顺序、失败传递、计划校验、多批次数、体力不足与消耗异常。

接口由 tools/build_gui_interface.mjs 生成；修改后重新生成 assets/interface.json，再运行 Schema 检查。源码启动时还会生成根目录 interface.json。发行构建参见 docs/gui.md。

2026-09-19：11 个关卡 X 难度入口均完成实机导航验证；通过真实 MFAAvalonia 配置与 Node Agent 执行“启动游戏→作战演练指定 2 次→缄默暗门周期跳过”，扫荡次数准确，任务链正常结束。全部关卡没有逐一消耗体力扫荡；其余关卡验证到难度选择。

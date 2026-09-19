# 回归测试

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

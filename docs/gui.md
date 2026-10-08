# Windows 图形界面

发行包解压后，双击根目录的 **MaaNightfall.exe**。启动器会在后台准备环境并打开 GUI，不弹出命令行窗口；失败时会弹出错误提示，日志保存在 `debug/launcher/`。请保留完整目录，不要单独移动 EXE。启动 GUI 时会自动启动所选 MuMu 安卓实例并等待 ADB 就绪；冷启动带出的 MuMu 主界面进程随后会被结束，已运行的实例直接复用。源码首次使用先执行 `powershell -NoProfile -ExecutionPolicy Bypass -File tools/build_launcher.ps1` 生成启动器，也可以继续使用 `run_gui.cmd`。首次从源码启动会准备 Node、MaaFramework、OCR、MFAAvalonia 以及缺少的 .NET 10 运行库，无须自己安装 Node 或 Python。需要网络，游戏和 MuMu 仍须自行安装并登录。

GUI 和命令行共用同一项目目录的 .state，缄默暗门下一次时间和罪恶博弈周限不会因切换入口而重置。请勿同时运行两套游戏任务。原 run_daily.cmd 的空格勾选、上下选择和回车执行保持可用。

## 模块与体力计划

初始任务列表按日常顺序排列，默认全部勾选。取消不需要的模块即可；罪恶博弈会关闭游戏，应保持在工作任务最后。

“体力计划”的设置中选择关卡，然后选择“指定次数”或“消耗可用体力”。支持录像中的 11 个 X 难度关卡。次数范围为 1–999；体力不足时只执行负担得起的次数，不购买体力。未解锁 X 或未确认关卡、次数、消耗时会停止并报错。

需要多条计划时，在 GUI 中通过“添加任务”重复添加“体力计划”，为每条分别配置关卡与次数，再拖动到需要的顺序。消耗可用体力的条目放在这些计划最后。可以修改任务备注来标注用途。GUI 保存这些选项，下次启动继续使用。

默认选择“日常：欲望酒会 3 次 → 家族遗迹按天轮换”。先扫荡欲望酒会 X 3 次，再用当天的一种家族遗迹消耗全部剩余体力。地牢血痕、密室残垣、市井焦土、古堡回声每天一种，四天一轮；以 2026-10-09 的地牢血痕为起点，按上海自然日计算，同一天重复运行仍刷同一种。默认日常忽略单关卡的次数设置；账号记录保存在 `.state/stamina-rotation.json`。现有配置中第一个默认关卡选项也改为该日常计划。

命令行也能读取有序计划 JSON，例如：

```json
[
  {"stage":"drill","count":3},
  {"stage":"money","count":2},
  {"stage":"castle","count":"all"}
]
```

保存为 config/stamina_plan.json 后执行：

```bat
runtimes\node\node.exe tools/run_daily.mjs --modules start,stamina --stamina-plan config/stamina_plan.json
```

可用 stage：drill 作战演练、money 金钱时代、dock 码头进击、parking 车场突围、park 园区增援、platform 站台攻歼、party 欲望酒会、dungeon 地牢血痕、chamber 密室残垣、city 市井焦土、castle 古堡回声，另支持 family_rotation 家族遗迹按天轮换。不传计划时命令行使用同一默认日常计划。

## 更新与发行

GUI 的更新源是本项目 GitHub，默认启动检查版本，不自动安装。只有发布完整 Release 包后才有可更新版本；推送源码不会成为 GUI 更新。正式发行包固定配套 GUI、MaaFramework、Node 和 .NET，避免单独更新一部分造成版本不匹配。

本地准备发行包：

```powershell
./tools/run_gui.ps1 -PrepareOnly
./runtimes/node/node.exe tools/setup_dotnet.mjs
./runtimes/node/node.exe tools/package_gui.mjs 0.2.0
```

输出在 dist/，只包含程序和资源，不含你的账号记录、日志、截图或现有 GUI 配置。发版工作流仅构建 Windows x64；GitHub Actions 可以手动构建测试包，推送 v 开头的版本标签时发布 Release。目前保留跨平台任务逻辑，未适配 macOS。

已有安装升级时保留 config/ 与 .state/；不要删除这两个目录。源码用户更新后可重新运行 `tools/build_launcher.ps1` 编译启动器，再双击 `MaaNightfall.exe`；原 `run_gui.cmd` 仍可使用。打包脚本会自动编译并包含启动器。

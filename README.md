# MaaYMZX

基于 [MaaFramework](https://github.com/MaaXYZ/MaaFramework) 的《夜幕之下》日常任务自动化项目。

当前版本针对 MuMu 模拟器、`1600×900` 横屏画面（模拟器设置为 `900×1600`）、DPI `320` 制作。MaaFramework 会把截图短边缩放到 720 后执行识别。

## 已实现流程

1. 启动游戏并关闭公告、活动弹窗；更新后出现“请重启游戏”时会确认并自动重新启动。
2. 进入 `家族事务 → 物资`，将关卡列表滑到最右端，再进入 `家族遗迹 → 古堡回声`，使用最大可用次数扫荡。
3. 在据点点击右侧“一键领取”，收取全部建筑产物并选择“再次生产”。
4. 仅处理“特供订单”和“专项订单”：始终操作最左侧卡片；显示“提交”就连续提交，只有显示“前往”时才刷新，直到对应订单标题消失。
5. 从主界面的“业务”进入秘密派遣，先“一键领取”，再在右下角连续点击两次“一键指派”，并依次关闭可能连续出现的夜行者传闻或世俗传闻。
6. 返回主界面后重新进入“业务”，处理五条巡夜简报：普通事件任选一个黑框；地图事件等待自动对话后任选一个黑框。
7. 领取日常任务和周常任务奖励。
8. 正常结束或流程错误时均关闭游戏。

“前往战斗”类型的巡夜简报目前只识别、不进入战斗；遇到时会停止本轮任务并关闭游戏。

## 模拟器和 ADB

- Android 包名：`com.bmystu.peng.gw`
- MuMu ADB 地址：`127.0.0.1:16384`
- MuMu ADB 程序：`C:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe`

如果 CMD 提示 `'adb' 不是内部或外部命令`，无需修改系统环境变量，直接运行完整路径：

```bat
"C:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe" connect 127.0.0.1:16384
"C:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe" devices -l
```

连接成功后，在通用 UI 中选择 MuMu 模拟器和 `127.0.0.1:16384`，然后运行“一键日常”。

## 命令行执行

先启动 MuMu 12，并将游戏保持在已登录状态。然后在本项目目录的 CMD 中执行：

```bat
run_daily.cmd
```

脚本会显示多选菜单：

1. 启动游戏
2. 清理体力
3. 据点产物与订单
4. 秘密派遣
5. 巡夜简报
6. 每日/每周奖励
7. 关闭游戏

输入多个序号时用空格分隔，例如 `1 3 5 7`；直接回车会执行全部模块。如果不选择“启动游戏”，请先把游戏停在主界面；如果不选择“关闭游戏”，任务完成后游戏会保持开启。

也可以直接通过英文模块名运行指定组合：

```bat
run_daily.cmd start stamina base dispatch briefing rewards close
run_daily.cmd start base close
run_daily.cmd close
```

模块名依次为 `start`、`stamina`、`base`、`dispatch`、`briefing`、`rewards`、`close`；`all` 表示全部模块。

首次实际运行前，可以只测试运行库和模拟器连接，不操作游戏：

```bat
run_daily.cmd --probe
```

脚本会先检查设备是否达到 `device` 状态；普通连接失败时，会自动断开旧连接、重启 ADB daemon 并重新连接。若端口配置错误或 MuMu 的 ADB 功能未开启，恢复流程仍会明确报错。

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

如果之后要把本目录初始化为自己的 GitHub 仓库，请在初始化 Git 后补充官方公共资源子模块：

```bash
git submodule add https://github.com/MaaXYZ/MaaCommonAssets.git assets/MaaCommonAssets
```

## 当前限制

- 只适配了录制视频对应的 UI 布局和分辨率。
- 据点的第二种产物气泡暂未处理。
- 巡夜简报的战斗分支暂未实现。
- 正式使用前应在测试账号上完成一次全流程回放，根据实际 OCR 日志微调识别区域。

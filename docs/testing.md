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

`.state/` 保存实际账号的每周次数，必须保留。OCR 模型、`node_modules/`、`.schema-deps/` 和 `.codex-tools/` 是本地运行或开发依赖，删除后需要重新安装。不要直接用 `git clean -fdX` 清空所有忽略文件。

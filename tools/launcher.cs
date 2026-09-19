using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows.Forms;
using System.Reflection;

[assembly: AssemblyTitle("MaaNightfall")]
[assembly: AssemblyDescription("MaaNightfall GUI launcher")]
[assembly: AssemblyVersion("1.0.0.0")]

internal static class Launcher
{
    [STAThread]
    private static int Main(string[] args)
    {
        bool prepareOnly = args.Length == 1 && args[0] == "--prepare-only";
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string log = Path.Combine(root, "debug", "launcher",
            DateTime.Now.ToString("yyyyMMdd-HHmmss-fff") + "-" + Process.GetCurrentProcess().Id + ".log");
        try
        {
            if (args.Length != 0 && !prepareOnly)
                throw new ArgumentException("Unsupported argument.");
            string script = Path.Combine(root, "tools", "run_gui.ps1");
            if (!File.Exists(script)) throw new FileNotFoundException("Missing tools/run_gui.ps1. Please extract the complete release package.", script);
            Directory.CreateDirectory(Path.GetDirectoryName(log));
            // Use the Windows-supplied PowerShell rather than an executable from PATH.
            string powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
                @"WindowsPowerShell\v1.0\powershell.exe");
            var info = new ProcessStartInfo(powershell,
                "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"" + script + "\"" +
                (prepareOnly ? " -PrepareOnly" : ""));
            info.WorkingDirectory = root;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;
            info.StandardOutputEncoding = Encoding.UTF8;
            info.StandardErrorEncoding = Encoding.UTF8;
            object gate = new object();
            using (var writer = new StreamWriter(log, false, new UTF8Encoding(false)))
            using (var process = new Process())
            {
                writer.AutoFlush = true;
                process.StartInfo = info;
                DataReceivedEventHandler capture = delegate(object sender, DataReceivedEventArgs e) {
                    if (e.Data != null) lock (gate) writer.WriteLine(e.Data);
                };
                process.OutputDataReceived += capture;
                process.ErrorDataReceived += capture;
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                process.WaitForExit();
                if (process.ExitCode != 0)
                    throw new Exception("Startup failed (exit code " + process.ExitCode + ").");
            }
            return 0;
        }
        catch (Exception error)
        {
            try { File.AppendAllText(log, Environment.NewLine + error.ToString(), Encoding.UTF8); } catch { }
            if (!prepareOnly)
                MessageBox.Show("MaaNightfall 启动失败。\n\n" + error.Message +
                    "\n\n启动日志：\n" + log, "MaaNightfall", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}

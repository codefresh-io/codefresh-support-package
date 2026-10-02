namespace CfSupport.Utils;

/// <summary>Per-run output directory and file logger. Console logging is intentionally off; use Console directly for user output.</summary>
public static class Log
{
    static readonly object Gate = new();
    static string? _dirPath;

    public static string DirPath => _dirPath ?? throw new InvalidOperationException("Log.Start() has not been called.");

    public static string Timestamp(DateTime utcNow) =>
        utcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'").Replace(':', '-').Replace('.', '-');

    public static void Start(string version)
    {
        _dirPath = $"cf-support-{Timestamp(DateTime.UtcNow)}";
        Directory.CreateDirectory(_dirPath);
        Info($"Starting cf-support version {version}");
    }

    public static void Info(string message) => Write("INFO", message);
    public static void Warn(string message) => Write("WARN", message);
    public static void Error(string message) => Write("ERROR", message);

    static void Write(string level, string message)
    {
        if (_dirPath is null) return;
        var line = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff} [{level}] {message}{Environment.NewLine}";
        lock (Gate)
        {
            // Open per write so the file is never held open while the directory is archived and deleted.
            File.AppendAllText(Path.Combine(_dirPath, "cf-support.log"), line);
        }
    }
}

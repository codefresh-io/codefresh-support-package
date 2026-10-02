using System.Reflection;

namespace CfSupport;

public static class AppInfo
{
    // Set at publish time with -p:Version=<tag>; falls back to the csproj default.
    public static string Version { get; } =
        (typeof(AppInfo).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "dev")
        .Split('+')[0];
}

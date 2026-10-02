using System.Text.Json.Nodes;
using CfSupport.Utils;

namespace CfSupport.Services.Kubernetes;

public static class PodLogs
{
    public static async Task<Dictionary<string, string>> Get(JsonObject pod)
    {
        var podName = pod["metadata"]?["name"]?.GetValue<string>();
        var ns = pod["metadata"]?["namespace"]?.GetValue<string>();
        var containers = pod["spec"]?["containers"]?.AsArray()
            .Select(c => c?["name"]?.GetValue<string>()).OfType<string>().ToList();
        var logs = new Dictionary<string, string>();

        Log.Info($"Fetching logs for pod: {podName}");

        if (podName is null || ns is null || containers is null)
        {
            Log.Error("Pod is missing required metadata or container specifications");
            throw new InvalidOperationException("Pod is missing required metadata or container specifications");
        }

        foreach (var container in containers)
        {
            try
            {
                Log.Info($"Fetching logs for container: {container} in pod: {podName}");
                logs[container] = await K8sClient.GetText(
                    $"/api/v1/namespaces/{Uri.EscapeDataString(ns)}/pods/{Uri.EscapeDataString(podName)}/log" +
                    $"?container={Uri.EscapeDataString(container)}&timestamps=true");
            }
            catch (Exception ex)
            {
                Log.Error($"Error fetching logs for container: {container} in pod: {podName}: {ex.Message}");
                logs[container] = $"Error: {ex.Message}";
            }
        }

        return logs;
    }
}

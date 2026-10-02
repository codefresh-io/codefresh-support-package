using System.Text;
using System.Text.Json.Nodes;
using CfSupport.Utils;

namespace CfSupport.Services.Kubernetes;

public static class Collector
{
    const int MaxConcurrency = 10;

    public static async Task CollectData(string dirPath, IReadOnlyDictionary<string, Func<Task<JsonNode?>>> k8sResources)
    {
        Console.WriteLine("Starting data collection for Kubernetes resources");
        Log.Info("Starting data collection for Kubernetes resources");

        await Files.WriteYaml(await K8sClient.GetClusterVersion(), "cluster_version", dirPath);

        foreach (var (k8sType, fetcher) in k8sResources)
        {
            try
            {
                Console.WriteLine($"Processing Data for {k8sType}");
                Log.Info($"Processing Data for {k8sType}");
                var resources = await fetcher();

                if (resources?["items"] is not JsonArray { Count: > 0 } items) continue;
                var objects = items.OfType<JsonObject>().ToList();

                switch (k8sType)
                {
                    case "secrets":
                        await CollectSecrets(objects, dirPath, k8sType);
                        break;
                    case "pods":
                        await CollectPods(objects, dirPath, k8sType);
                        break;
                    case "events.k8s.io":
                        await CollectEvents(objects, dirPath, k8sType);
                        break;
                    default:
                        await CollectGeneric(objects, dirPath, k8sType);
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to fetch {k8sType}: {ex.Message}");
                Log.Error($"Failed to fetch {k8sType}: {ex.Message}");
            }
        }
    }

    static string Name(JsonObject o) => o["metadata"]?["name"]?.GetValue<string>() ?? "unknown";

    static void StripManagedFields(JsonObject o) => (o["metadata"] as JsonObject)?.Remove("managedFields");

    static async Task CollectSecrets(List<JsonObject> secrets, string dirPath, string k8sType)
    {
        Console.WriteLine("Redacting secrets data");
        foreach (var secret in secrets)
        {
            Log.Info($"Redacting secret {Name(secret)}");
            StripManagedFields(secret);
            (secret["metadata"]?["annotations"] as JsonObject)?.Remove("kubectl.kubernetes.io/last-applied-configuration");
            secret.Remove("stringData");
            secret.Remove("binaryData");
            secret["data"] = new JsonObject { ["REDACTED"] = "Data is redacted by the support package" };
            await Files.WriteYaml(secret, $"{Name(secret)}_get", $"{dirPath}/{k8sType}");
        }
    }

    static async Task CollectPods(List<JsonObject> pods, string dirPath, string k8sType)
    {
        foreach (var pod in pods)
        {
            StripManagedFields(pod);
            var podDir = $"{dirPath}/{k8sType}/{Name(pod)}";
            await Files.WriteYaml(pod, $"spec_{Name(pod)}", podDir);
            foreach (var (container, log) in await PodLogs.Get(pod))
                await File.WriteAllTextAsync($"{podDir}/log_{container}.log", log);
        }
    }

    static async Task CollectEvents(List<JsonObject> events, string dirPath, string k8sType)
    {
        // Tab-separated despite the .csv extension, matching the Deno tool's output.
        var sb = new StringBuilder("LAST SEEN\tTYPE\tREASON\tOBJECT\tMESSAGE\n");
        sb.AppendJoin('\n', events.Select(e =>
        {
            var created = e["metadata"]?["creationTimestamp"]?.GetValue<string>();
            var lastSeen = created is not null && DateTimeOffset.TryParse(created, out var t)
                ? t.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'")
                : "Invalid Date";
            return $"{lastSeen}\t{e["type"]?.GetValue<string>() ?? "Unknown"}\t{e["reason"]?.GetValue<string>() ?? "Unknown"}" +
                   $"\t{e["involvedObject"]?["kind"]?.GetValue<string>()}/{e["involvedObject"]?["name"]?.GetValue<string>()}" +
                   $"\t{e["message"]?.GetValue<string>() ?? "No message"}";
        }));
        await File.WriteAllTextAsync($"{dirPath}/{k8sType}.csv", sb.ToString());
    }

    static async Task CollectGeneric(List<JsonObject> items, string dirPath, string k8sType)
    {
        using var gate = new SemaphoreSlim(MaxConcurrency);
        await Task.WhenAll(items.Select(async data =>
        {
            await gate.WaitAsync();
            try
            {
                StripManagedFields(data);
                await Files.WriteYaml(data, $"{Name(data)}_get", $"{dirPath}/{k8sType}");
            }
            finally
            {
                gate.Release();
            }
        }));
    }
}

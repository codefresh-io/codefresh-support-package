using System.Text.Json.Nodes;
using CfSupport.Utils;
using k8s;

namespace CfSupport.Services.Kubernetes;

/// <summary>Thin raw-JSON wrapper over the official client's authenticated HttpClient (no typed models, so no reflection).</summary>
public static class K8sClient
{
    static readonly Lazy<k8s.Kubernetes> Client = new(() =>
        new k8s.Kubernetes(KubernetesClientConfiguration.BuildDefaultConfig()));

    static async Task<string> GetString(string pathAndQuery)
    {
        var client = Client.Value;
        using var res = await client.HttpClient.GetAsync(new Uri(client.BaseUri, pathAndQuery.TrimStart('/')));
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode) throw new HttpRequestException($"{(int)res.StatusCode} {res.ReasonPhrase}: {body}");
        return body;
    }

    public static async Task<JsonNode?> GetJson(string pathAndQuery) => JsonNode.Parse(await GetString(pathAndQuery));

    public static Task<string> GetText(string pathAndQuery) => GetString(pathAndQuery);

    public static async Task<JsonNode> GetClusterVersion()
    {
        try
        {
            var version = await GetJson("/version");
            Log.Info($"Successfully fetched cluster version: {version?.ToJsonString()}");
            return version ?? new JsonObject();
        }
        catch (Exception ex)
        {
            Log.Error($"Failed to fetch cluster version: {ex.Message}");
            return new JsonObject { ["error"] = $"Failed to fetch cluster version: {ex.Message}" };
        }
    }

    public static async Task<string> SelectNamespace()
    {
        Log.Info("Fetching namespaces from the Kubernetes cluster");
        var list = await GetJson("/api/v1/namespaces");
        var namespaces = (list?["items"]?.AsArray() ?? [])
            .Select(n => n?["metadata"]?["name"]?.GetValue<string>())
            .OfType<string>()
            .ToList();
        return Prompt.Select(namespaces, "Which Namespace are we using?", "namespace");
    }
}

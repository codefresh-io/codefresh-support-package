using System.Text.Json.Nodes;
using CfSupport.Utils;

namespace CfSupport.Services.Kubernetes;

public static class Resources
{
    const string CodefreshLabel = "labelSelector=io.codefresh.accountName";

    static readonly string[] CodefreshCrds =
    [
        "products", "promotionflows", "promotionpolicies", "promotiontemplates", "restrictedgitsources",
    ];

    static readonly string[] ArgoCrds =
    [
        "analysisruns", "analysistemplates", "applications", "applicationsets", "appprojects",
        "eventbus", "eventsources", "experiments", "rollouts", "sensors",
    ];

    /// <summary>The dictionary key is the output sub-directory name.</summary>
    public static IReadOnlyDictionary<string, Func<Task<JsonNode?>>> Get(string ns)
    {
        Log.Info($"Generating resource fetchers for namespace {ns}");
        var n = Uri.EscapeDataString(ns);

        var map = new Dictionary<string, Func<Task<JsonNode?>>>
        {
            ["configmaps"] = () => K8sClient.GetJson($"/api/v1/namespaces/{n}/configmaps"),
            ["cronjobs.batch"] = () => K8sClient.GetJson($"/apis/batch/v1/namespaces/{n}/cronjobs"),
            ["daemonsets.apps"] = () => K8sClient.GetJson($"/apis/apps/v1/namespaces/{n}/daemonsets"),
            ["deployments.apps"] = () => K8sClient.GetJson($"/apis/apps/v1/namespaces/{n}/deployments"),
            ["events.k8s.io"] = () => GetSortedEvents(ns),
            ["jobs.batch"] = () => K8sClient.GetJson($"/apis/batch/v1/namespaces/{n}/jobs"),
            ["nodes"] = () => K8sClient.GetJson("/api/v1/nodes"),
            ["pods"] = () => K8sClient.GetJson($"/api/v1/namespaces/{n}/pods"),
            ["secrets"] = () => K8sClient.GetJson($"/api/v1/namespaces/{n}/secrets"),
            ["serviceaccounts"] = () => K8sClient.GetJson($"/api/v1/namespaces/{n}/serviceaccounts"),
            ["services"] = () => K8sClient.GetJson($"/api/v1/namespaces/{n}/services"),
            ["statefulsets.apps"] = () => K8sClient.GetJson($"/apis/apps/v1/namespaces/{n}/statefulsets"),
            ["persistentvolumeclaims"] = () => K8sClient.GetJson($"/api/v1/namespaces/{n}/persistentvolumeclaims?{CodefreshLabel}"),
            ["persistentvolumes"] = () => K8sClient.GetJson($"/api/v1/persistentvolumes?{CodefreshLabel}"),
            ["storageclasses.storage.k8s.io"] = () => K8sClient.GetJson("/apis/storage.k8s.io/v1/storageclasses"),
        };

        foreach (var crd in CodefreshCrds) map[$"{crd}.codefresh.io"] = () => GetCrd($"{crd}.codefresh.io", ns);
        foreach (var crd in ArgoCrds) map[$"{crd}.argoproj.io"] = () => GetCrd($"{crd}.argoproj.io", ns);
        return map;
    }

    static async Task<JsonNode?> GetCrd(string type, string ns)
    {
        Log.Info($"Attempting to fetch CRD {type} in namespace {ns}");
        try
        {
            var crd = await K8sClient.GetJson($"/apis/apiextensions.k8s.io/v1/customresourcedefinitions/{type}");
            var spec = crd?["spec"];
            var version = spec?["versions"]?.AsArray()
                .FirstOrDefault(v => v?["served"]?.GetValue<bool>() == true)?["name"]?.GetValue<string>();
            var path = $"/apis/{spec?["group"]?.GetValue<string>()}/{version}/namespaces/{Uri.EscapeDataString(ns)}/{spec?["names"]?["plural"]?.GetValue<string>()}";
            return await K8sClient.GetJson(path);
        }
        catch (Exception ex)
        {
            Log.Warn($"CRD {type} not found or failed to fetch in namespace {ns}: {ex.Message}");
            return null;
        }
    }

    static async Task<JsonNode?> GetSortedEvents(string ns)
    {
        Log.Info($"Fetching and sorting events for namespace {ns}");
        try
        {
            var events = await K8sClient.GetJson($"/api/v1/namespaces/{Uri.EscapeDataString(ns)}/events");
            if (events is JsonObject obj && obj["items"] is JsonArray items)
            {
                // Missing timestamps sort last; List.Sort is unstable so use a stable LINQ ordering.
                var sorted = items
                    .Select(i => i!)
                    .OrderBy(i => Timestamp(i) is null)
                    .ThenBy(i => Timestamp(i) ?? default)
                    .ToList();
                items.Clear();
                foreach (var item in sorted) items.Add(item);
            }
            return events;
        }
        catch (Exception ex)
        {
            Log.Error($"Failed to fetch events for namespace {ns}: {ex.Message}");
            return new JsonObject { ["items"] = new JsonArray() };
        }
    }

    static DateTimeOffset? Timestamp(JsonNode item) =>
        DateTimeOffset.TryParse(item["metadata"]?["creationTimestamp"]?.GetValue<string>(), out var t) ? t : null;
}

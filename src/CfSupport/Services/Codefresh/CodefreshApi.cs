using System.Text.Json.Nodes;

namespace CfSupport.Services.Codefresh;

public static class CodefreshApi
{
    // Account runtimes (Account Admin token)
    public static async Task<JsonArray> GetAccountRuntimes(CodefreshCredentials creds) =>
        (await CodefreshClient.GetJson(creds, "/runtime-environments"))?.AsArray() ?? [];

    public static Task<JsonNode?> GetAccountRuntimeSpec(CodefreshCredentials creds, string runtime) =>
        CodefreshClient.GetJson(creds, $"/runtime-environments/{Uri.EscapeDataString(runtime)}");

    // System admin endpoints (On-Prem, System Admin token)
    public static Task<JsonNode?> GetSystemAccounts(CodefreshCredentials creds) =>
        CodefreshClient.GetJson(creds, "/admin/accounts");

    public static Task<JsonNode?> GetSystemRuntimes(CodefreshCredentials creds) =>
        CodefreshClient.GetJson(creds, "/admin/runtime-environments");

    public static Task<JsonNode?> GetSystemFeatureFlags(CodefreshCredentials creds) =>
        CodefreshClient.GetJson(creds, "/admin/features");

    public static async Task<JsonNode?> GetSystemTotalUsers(CodefreshCredentials creds)
    {
        var users = await CodefreshClient.GetJson(creds, "/admin/user?limit=1&page=1");
        return new JsonObject { ["totalUsers"] = users?["total"]?.DeepClone() };
    }
}

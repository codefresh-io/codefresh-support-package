using System.Text.Json.Nodes;
using CfSupport.Utils;
using YamlDotNet.RepresentationModel;

namespace CfSupport.Services.Codefresh;

public sealed record CodefreshCredentials(string Authorization, string BaseUrl);

public static class CodefreshClient
{
    // On-prem installs frequently use self-signed certificates; the Deno build ran with certificate errors ignored.
    static readonly HttpClient Http = new(new SocketsHttpHandler
    {
        SslOptions = { RemoteCertificateValidationCallback = (_, _, _, _) => true },
    });

    public static async Task<CodefreshCredentials?> GetCredentials()
    {
        var envToken = Environment.GetEnvironmentVariable("CF_API_KEY");
        var envUrl = Environment.GetEnvironmentVariable("CF_URL");

        if (!string.IsNullOrEmpty(envToken) && !string.IsNullOrEmpty(envUrl))
        {
            Log.Info("Using Codefresh API credentials from environment variables");
            var creds = new CodefreshCredentials(envToken, $"{envUrl.TrimEnd('/')}/api");
            return await Validate(creds) ? creds : null;
        }

        var home = Environment.GetEnvironmentVariable(OperatingSystem.IsWindows() ? "USERPROFILE" : "HOME");
        var configPath = $"{home}/.cfconfig";
        if (!File.Exists(configPath))
        {
            Log.Warn($"Codefresh config file not found: {configPath}");
            return null;
        }

        var context = ReadCurrentContext(configPath);
        if (context is null) return null;

        Log.Info($"Using Codefresh API credentials from config file: {configPath}");
        var cfg = new CodefreshCredentials(context.Value.Token, $"{context.Value.Url.TrimEnd('/')}/api");
        return await Validate(cfg) ? cfg : null;
    }

    static (string Token, string Url)? ReadCurrentContext(string configPath)
    {
        var stream = new YamlStream();
        using (var reader = new StreamReader(configPath)) stream.Load(reader);
        if (stream.Documents.Count == 0 || stream.Documents[0].RootNode is not YamlMappingNode root) return null;

        string? Scalar(YamlMappingNode map, string key) =>
            map.Children.TryGetValue(new YamlScalarNode(key), out var n) && n is YamlScalarNode s ? s.Value : null;

        var current = Scalar(root, "current-context");
        if (current is null || !root.Children.TryGetValue(new YamlScalarNode("contexts"), out var contexts)
            || contexts is not YamlMappingNode ctxMap
            || !ctxMap.Children.TryGetValue(new YamlScalarNode(current), out var ctx)
            || ctx is not YamlMappingNode ctxNode) return null;

        var token = Scalar(ctxNode, "token");
        var url = Scalar(ctxNode, "url");
        return token is null || url is null ? null : (token, url);
    }

    static async Task<bool> Validate(CodefreshCredentials creds)
    {
        Log.Info("Validating Codefresh API credentials");
        try
        {
            using var res = await Get(creds, "/runtime-environments");
            if (!res.IsSuccessStatusCode)
            {
                Log.Error($"Invalid Codefresh API credentials: {(int)res.StatusCode} {res.ReasonPhrase}");
                return false;
            }
        }
        catch (HttpRequestException ex)
        {
            Log.Error($"Could not reach Codefresh API: {ex.Message}");
            return false;
        }

        Log.Info("Codefresh API credentials validated successfully");
        return true;
    }

    // Single request wrapper: every service calls this, never HttpClient directly.
    public static Task<HttpResponseMessage> Get(CodefreshCredentials creds, string path)
    {
        Log.Info($"Making API request to Codefresh: {path}");
        var request = new HttpRequestMessage(HttpMethod.Get, $"{creds.BaseUrl}{path}");
        request.Headers.TryAddWithoutValidation("Authorization", creds.Authorization);
        return Http.SendAsync(request);
    }

    public static async Task<JsonNode?> GetJson(CodefreshCredentials creds, string path)
    {
        using var res = await Get(creds, path);
        res.EnsureSuccessStatusCode();
        return JsonNode.Parse(await res.Content.ReadAsStringAsync());
    }
}

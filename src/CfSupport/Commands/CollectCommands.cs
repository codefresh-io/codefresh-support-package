using System.Text.Json.Nodes;
using CfSupport.Services.Codefresh;
using CfSupport.Services.Kubernetes;
using CfSupport.Utils;
using ConsoleAppFramework;

namespace CfSupport.Commands;

public class CollectCommands
{
    const string SaasUrl = "https://g.codefresh.io/api";

    /// <summary>Collect data for the Codefresh GitOps Runtime</summary>
    /// <param name="namespace">-n, The namespace where the GitOps Runtime is installed</param>
    [Command("gitops")]
    public Task GitOps(string? @namespace = null) => Simple("gitops", "GitOps Runtime", @namespace);

    /// <summary>Collect data for the Open Source ArgoCD</summary>
    /// <param name="namespace">-n, The namespace where the OSS ArgoCD is installed</param>
    [Command("oss")]
    public Task Oss(string? @namespace = null) => Simple("oss", "OSS ArgoCD", @namespace);

    /// <summary>Collect data for the Codefresh Pipelines Runtime</summary>
    /// <param name="namespace">-n, The namespace where the Pipelines Runtime is installed</param>
    /// <param name="runtime">-r, The name of the Pipelines Runtime</param>
    [Command("pipelines")]
    public async Task Pipelines(string? @namespace = null, string? runtime = null)
    {
        Log.Start(AppInfo.Version);
        Log.Info("Starting data collection for Pipelines Runtime");
        var ns = @namespace ?? await PromptNamespace();
        var creds = await CodefreshClient.GetCredentials();

        if (creds is not null)
        {
            Log.Info("Fetching Pipelines Runtime information using Codefresh API credentials");
            if (runtime is null)
            {
                Log.Info("No runtime provided. Fetching list of runtimes for account and prompting user to select one.");
                var runtimes = await CodefreshApi.GetAccountRuntimes(creds);
                if (runtimes.Count != 0)
                {
                    var names = runtimes.Select(r => r?["metadata"]?["name"]?.GetValue<string>() ?? "unknown").ToList();
                    var chosen = Prompt.Select(names, "Which Pipelines Runtime Are We Working With?", "runtime");
                    await Files.WriteYaml(runtimes[names.IndexOf(chosen)], "Runtime_Spec", Log.DirPath);
                    Log.Info($"Successfully wrote runtime spec for {chosen} to file");
                }
            }
            else
            {
                Log.Info($"Runtime provided via CLI option: {runtime}. Fetching runtime spec for {runtime}");
                await Files.WriteYaml(await CodefreshApi.GetAccountRuntimeSpec(creds, runtime), "Runtime_Spec", Log.DirPath);
                Log.Info($"Successfully wrote runtime spec for {runtime} to file");
            }
        }

        await Collect("pipelines", "Pipelines Runtime", ns);
    }

    /// <summary>Collect data for the Codefresh OnPrem Installation</summary>
    /// <param name="namespace">-n, The namespace where Codefresh OnPrem is installed</param>
    [Command("onprem")]
    public async Task OnPrem(string? @namespace = null)
    {
        Log.Start(AppInfo.Version);
        Log.Info("Starting data collection for Codefresh OnPrem Installation");
        var creds = await CodefreshClient.GetCredentials();

        if (creds?.BaseUrl == SaasUrl)
        {
            const string msg = "Cannot gather On-Prem data for Codefresh SaaS. If you need to gather data for Codefresh On-Prem, please update your ./cfconfig context (or Envs) to point to an On-Prem instance.";
            const string hint = "For Codefresh SaaS, use \"pipelines\" or \"gitops\" commands.";
            Console.Error.WriteLine(msg);
            Log.Error(msg);
            Console.Error.WriteLine(hint);
            Log.Error(hint);
            Directory.Delete(Log.DirPath, recursive: true);
            Environment.Exit(1);
        }

        var ns = @namespace ?? await PromptNamespace();

        if (creds is not null)
        {
            Log.Info("Fetching additional On-Prem system data using Codefresh API credentials");
            var fetchers = new (string Name, Func<Task<JsonNode?>> Fetch)[]
            {
                ("OnPrem_Accounts", () => CodefreshApi.GetSystemAccounts(creds)),
                ("OnPrem_Runtimes", () => CodefreshApi.GetSystemRuntimes(creds)),
                ("OnPrem_Feature_Flags", () => CodefreshApi.GetSystemFeatureFlags(creds)),
                ("OnPrem_Total_Users", () => CodefreshApi.GetSystemTotalUsers(creds)),
            };

            foreach (var (name, fetch) in fetchers)
            {
                try
                {
                    Log.Info($"Fetching {name} from Codefresh API");
                    await Files.WriteYaml(await fetch(), name, Log.DirPath);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Failed to fetch or write {name}:\n{ex.Message}");
                    Log.Error($"Failed to fetch or write {name}:\n{ex}");
                }
            }
        }

        await Collect("onprem", "Codefresh OnPrem", ns);
    }

    static async Task Simple(string type, string label, string? @namespace)
    {
        Log.Start(AppInfo.Version);
        Log.Info($"Starting data collection for {label}");
        await Collect(type, label, @namespace ?? await PromptNamespace());
    }

    static async Task<string> PromptNamespace()
    {
        Log.Info("No namespace provided. Prompting user to select a namespace.");
        return await K8sClient.SelectNamespace();
    }

    static async Task Collect(string type, string label, string ns)
    {
        Console.WriteLine($"Gathering data in the '{ns}' namespace for {label}");
        Log.Info($"Gathering data in the '{ns}' namespace for {label}");
        await Collector.CollectData(Log.DirPath, Resources.Get(ns));
        await Files.PreparePackage(Log.DirPath, type);
    }
}

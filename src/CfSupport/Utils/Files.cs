using System.Formats.Tar;
using System.IO.Compression;
using System.Text.Json.Nodes;

namespace CfSupport.Utils;

public static class Files
{
    public static async Task WriteYaml(JsonNode? data, string name, string dirPath)
    {
        Directory.CreateDirectory(dirPath);
        await File.WriteAllTextAsync(Path.Combine(dirPath, $"{name}.yaml"), Yaml.ToYaml(data));
    }

    public static async Task PreparePackage(string dirPath, string type)
    {
        var archive = $"{type}-{dirPath}.tar.gz";
        Console.WriteLine("Preparing the Support Package");
        Log.Info($"Preparing the Support Package: {archive}");

        try
        {
            await using (var file = File.Create(archive))
            await using (var gzip = new GZipStream(file, CompressionLevel.Optimal))
            {
                await TarFile.CreateFromDirectoryAsync(dirPath, gzip, includeBaseDirectory: true);
            }
        }
        catch (Exception ex)
        {
            Log.Error($"Failed to create tar.gz: {archive}\n{ex.Message}");
            throw new InvalidOperationException($"Failed to create tar.gz: {archive}\n{ex.Message}", ex);
        }

        Console.WriteLine("Cleaning up temp directory");
        Directory.Delete(dirPath, recursive: true);
        Console.WriteLine($"\nPlease attach {archive} to your support ticket.");
    }
}

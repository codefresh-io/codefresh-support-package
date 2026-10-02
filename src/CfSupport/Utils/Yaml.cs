using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;

namespace CfSupport.Utils;

/// <summary>Reflection-free JsonNode to YAML conversion (NativeAOT safe).</summary>
public static class Yaml
{
    static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "true", "false", "null", "yes", "no", "on", "off", "y", "n", "~", ".inf", "-.inf", "+.inf", ".nan",
    };

    public static string ToYaml(JsonNode? node)
    {
        var writer = new StringWriter();
        var emitter = new Emitter(writer);
        emitter.Emit(new StreamStart());
        emitter.Emit(new DocumentStart());
        Write(emitter, node);
        emitter.Emit(new DocumentEnd(true));
        emitter.Emit(new StreamEnd());
        return writer.ToString();
    }

    static void Write(Emitter emitter, JsonNode? node)
    {
        switch (node)
        {
            case null:
                Plain(emitter, "null");
                break;
            case JsonObject obj:
                emitter.Emit(new MappingStart(AnchorName.Empty, TagName.Empty, true, MappingStyle.Block));
                foreach (var (key, value) in obj)
                {
                    WriteString(emitter, key);
                    Write(emitter, value);
                }
                emitter.Emit(new MappingEnd());
                break;
            case JsonArray arr:
                emitter.Emit(new SequenceStart(AnchorName.Empty, TagName.Empty, true, SequenceStyle.Block));
                foreach (var item in arr) Write(emitter, item);
                emitter.Emit(new SequenceEnd());
                break;
            default:
                var kind = node.GetValueKind();
                if (kind == JsonValueKind.String) WriteString(emitter, node.GetValue<string>());
                else Plain(emitter, node.ToJsonString()); // numbers, booleans
                break;
        }
    }

    static void Plain(Emitter emitter, string value) =>
        emitter.Emit(new Scalar(AnchorName.Empty, TagName.Empty, value, ScalarStyle.Plain, true, false));

    static void WriteString(Emitter emitter, string value)
    {
        var style = value.Contains('\n') ? ScalarStyle.Literal
            : NeedsQuoting(value) ? ScalarStyle.SingleQuoted
            : ScalarStyle.Plain;
        emitter.Emit(new Scalar(AnchorName.Empty, TagName.Empty, value, style, style == ScalarStyle.Plain, style != ScalarStyle.Plain));
    }

    static bool NeedsQuoting(string value)
    {
        if (value.Length == 0 || Reserved.Contains(value)) return true;
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out _)) return true;
        if (value.StartsWith("0x", StringComparison.OrdinalIgnoreCase) || value.StartsWith("0o", StringComparison.OrdinalIgnoreCase)) return true;
        // Timestamps and dates (e.g. 2026-10-02T01:02:03Z) would be re-typed by YAML 1.1 parsers.
        return value.Length >= 8 && char.IsAsciiDigit(value[0]) && char.IsAsciiDigit(value[3]) && value[4] == '-';
    }
}

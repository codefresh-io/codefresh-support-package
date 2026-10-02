namespace CfSupport.Utils;

public static class Prompt
{
    /// <summary>Prints a numbered list and loops until the user enters a valid 1-based number.</summary>
    public static string Select(IReadOnlyList<string> options, string question, string what)
    {
        for (var i = 0; i < options.Count; i++)
        {
            Console.WriteLine($"{i + 1}. {options[i]}");
            Log.Info($"{i + 1}: {options[i]}");
        }

        while (true)
        {
            Console.Write($"\n{question} (Number): ");
            var input = Console.ReadLine() ?? throw new InvalidOperationException("No input available to select an option.");
            Log.Info($"User selected {what} option: {input}");
            if (int.TryParse(input.Trim(), out var selection) && selection >= 1 && selection <= options.Count)
            {
                Log.Info($"User selected {what}: {options[selection - 1]}");
                return options[selection - 1];
            }

            Console.Error.WriteLine($"Invalid selection. Please enter a number corresponding to one of the listed {what}s.");
            Log.Warn($"Invalid selection for {what}. User input must be a number corresponding to one of the listed {what}s. user input: {input}");
        }
    }
}

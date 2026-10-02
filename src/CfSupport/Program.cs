using CfSupport.Commands;
using ConsoleAppFramework;

var app = ConsoleApp.Create();
app.Add<CollectCommands>();
await app.RunAsync(args);

using System;

// Minimal Streamlink stand-in used by tests/streamlink.test.ps1.
// It mimics `streamlink --stream-url <page> <quality>` and prints a direct
// stream URL, so the whole DePLay resolve pipeline can be tested offline.
internal static class FakeStreamlink
{
    private static int Main(string[] args)
    {
        string url = Environment.GetEnvironmentVariable("FAKE_STREAMLINK_URL");
        if (string.IsNullOrEmpty(url)) url = "http://127.0.0.1:9/fake/playlist.m3u8";

        string failure = Environment.GetEnvironmentVariable("FAKE_STREAMLINK_FAIL");
        if (failure == "1")
        {
            Console.Error.WriteLine("[cli][error] No playable streams found on this URL");
            return 1;
        }

        for (int i = 0; i < args.Length; i++)
            Console.Error.WriteLine("[cli][info] fake streamlink argument: " + args[i]);

        Console.WriteLine(url);
        return 0;
    }
}

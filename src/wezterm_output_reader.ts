import { execFile } from "child_process";

function execFileAsync(
  file: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

export default class WeztermOutputReader {
  private weztermBin: string;

  constructor() {
    this.weztermBin = "wezterm";
  }

  async readOutput(
    lines: number = 50,
    paneId?: number
  ): Promise<{ content: any[] }> {
    try {
      const args = ["cli", "get-text"];

      if (paneId !== undefined) {
        args.push("--pane-id", String(paneId));
      }

      if (lines > 0) {
        const startLine = -lines;
        args.push("--start-line", String(startLine));
      }

      const { stdout } = await execFileAsync(this.weztermBin, args);

      return {
        content: [
          {
            type: "text",
            text: stdout || "(empty output)",
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to read terminal output: ${error.message}\nMake sure WezTerm is running and the mux server is enabled.\nTry running: wezterm cli list`,
          },
        ],
      };
    }
  }
}

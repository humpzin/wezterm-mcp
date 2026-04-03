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

export default class WeztermExecutor {
  private weztermBin: string;

  constructor() {
    this.weztermBin = "wezterm";
  }

  async writeToTerminal(command: string): Promise<{ content: any[] }> {
    try {
      const { stdout: paneInfo } = await execFileAsync(this.weztermBin, [
        "cli",
        "list",
      ]);

      await execFileAsync(this.weztermBin, [
        "cli",
        "send-text",
        "--no-paste",
        command + "\n",
      ]);

      return {
        content: [
          {
            type: "text",
            text: `Command sent to WezTerm: ${command}\n\nCurrent panes:\n${paneInfo}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to write to terminal: ${error.message}\nMake sure WezTerm is running and the mux server is enabled.`,
          },
        ],
      };
    }
  }

  async writeToSpecificPane(
    command: string,
    paneId: number
  ): Promise<{ content: any[] }> {
    try {
      await execFileAsync(this.weztermBin, [
        "cli",
        "send-text",
        "--pane-id",
        String(paneId),
        "--no-paste",
        command + "\n",
      ]);

      return {
        content: [
          {
            type: "text",
            text: `Command sent to pane ${paneId}: ${command}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to write to pane ${paneId}: ${error.message}`,
          },
        ],
      };
    }
  }

  async listPanes(): Promise<{ content: any[] }> {
    try {
      const { stdout } = await execFileAsync(this.weztermBin, ["cli", "list"]);
      return {
        content: [
          {
            type: "text",
            text: stdout,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to list panes: ${error.message}\nMake sure WezTerm is running and the mux server is enabled.`,
          },
        ],
      };
    }
  }

  async switchPane(paneId: number): Promise<{ content: any[] }> {
    try {
      await execFileAsync(this.weztermBin, [
        "cli",
        "activate-pane",
        "--pane-id",
        String(paneId),
      ]);
      return {
        content: [
          {
            type: "text",
            text: `Switched to pane ${paneId}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to switch pane: ${error.message}\nMake sure the pane ID ${paneId} exists.`,
          },
        ],
      };
    }
  }
}

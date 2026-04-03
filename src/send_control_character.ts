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

export default class SendControlCharacter {
  private weztermBin: string;

  constructor() {
    this.weztermBin = "wezterm";
  }

  async send(character: string, paneId?: number): Promise<{ content: any[] }> {
    try {
      const controlMap: { [key: string]: string } = {
        c: "\x03", // Ctrl+C
        d: "\x04", // Ctrl+D
        z: "\x1a", // Ctrl+Z
        l: "\x0c", // Ctrl+L
        a: "\x01", // Ctrl+A
        e: "\x05", // Ctrl+E
        k: "\x0b", // Ctrl+K
        u: "\x15", // Ctrl+U
        w: "\x17", // Ctrl+W
      };

      const controlSeq = controlMap[character.toLowerCase()];
      if (!controlSeq) {
        throw new Error(`Unknown control character: ${character}`);
      }

      const args = ["cli", "send-text", "--no-paste"];
      if (paneId !== undefined) {
        args.push("--pane-id", String(paneId));
      }
      args.push(controlSeq);

      await execFileAsync(this.weztermBin, args);

      return {
        content: [
          {
            type: "text",
            text: `Sent control character: Ctrl+${character.toUpperCase()}${paneId !== undefined ? ` to pane ${paneId}` : ""}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to send control character: ${error.message}`);
    }
  }
}

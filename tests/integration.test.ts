import { execFile } from "child_process";

// child_processモジュールをモック化
jest.mock("child_process");
const mockedExecFile = jest.mocked(execFile);

// 各クラスのインポート
import WeztermExecutor from "../src/wezterm_executor";
import WeztermOutputReader from "../src/wezterm_output_reader";
import SendControlCharacter from "../src/send_control_character";

describe("Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("全体的なワークフロー", () => {
    it("コマンド実行 → 出力読み取り → 制御文字送信の一連の流れが動作すること", async () => {
      const executor = new WeztermExecutor();
      const outputReader = new WeztermOutputReader();
      const controlCharSender = new SendControlCharacter();

      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          if (args.includes("list")) {
            callback(null, "pane_id=1 active=true", "");
          } else if (args.includes("send-text")) {
            callback(null, "", "");
          } else if (args.includes("get-text")) {
            callback(null, "hello\n", "");
          } else {
            callback(null, "", "");
          }
          return {} as any;
        }
      );

      const writeResult = await executor.writeToTerminal('echo "hello"');
      expect(writeResult.content[0].text).toContain("Command sent to WezTerm");

      const readResult = await outputReader.readOutput(10);
      expect(readResult.content[0].text).toBe("hello\n");

      const controlResult = await controlCharSender.send("c");
      expect(controlResult.content[0].text).toBe(
        "Sent control character: Ctrl+C"
      );
    }, 15000);

    it("エラーハンドリングが各クラスで一貫していること", async () => {
      const executor = new WeztermExecutor();
      const outputReader = new WeztermOutputReader();

      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(new Error("WezTerm not available"), null, null);
          return {} as any;
        }
      );

      const writeResult = await executor.writeToTerminal("test");
      expect(writeResult.content[0].text).toContain(
        "Failed to write to terminal"
      );
      expect(writeResult.content[0].text).toContain("WezTerm not available");

      const readResult = await outputReader.readOutput(10);
      expect(readResult.content[0].text).toContain(
        "Failed to read terminal output"
      );
      expect(readResult.content[0].text).toContain("WezTerm not available");

      const controlCharSender = new SendControlCharacter();
      await expect(controlCharSender.send("c")).rejects.toThrow(
        "Failed to send control character: WezTerm not available"
      );
    });

    it("複数のペインでの操作が正常に動作すること", async () => {
      const executor = new WeztermExecutor();

      // ペイン一覧取得
      mockedExecFile.mockImplementationOnce(
        (file: string, args: any, callback: any) => {
          callback(
            null,
            "pane_id=1 active=true\npane_id=2 active=false",
            ""
          );
          return {} as any;
        }
      );

      const listResult = await executor.listPanes();
      expect(listResult.content[0].text).toContain("pane_id=1");
      expect(listResult.content[0].text).toContain("pane_id=2");

      // ペイン切り替え
      mockedExecFile.mockImplementationOnce(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("activate-pane");
          expect(args).toContain("2");
          callback(null, "", "");
          return {} as any;
        }
      );

      const switchResult = await executor.switchPane(2);
      expect(switchResult.content[0].text).toBe("Switched to pane 2");

      // 特定のペインにコマンド送信
      mockedExecFile.mockImplementationOnce(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("--pane-id");
          expect(args).toContain("2");
          callback(null, "", "");
          return {} as any;
        }
      );

      const writeToSpecificResult = await executor.writeToSpecificPane("ls", 2);
      expect(writeToSpecificResult.content[0].text).toBe(
        "Command sent to pane 2: ls"
      );
    });
  });

  describe("パフォーマンステスト", () => {
    it("大量のコマンド実行が適切に処理されること", async () => {
      const executor = new WeztermExecutor();

      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          if (args.includes("list")) {
            callback(null, "pane_id=1 active=true", "");
          } else {
            callback(null, "", "");
          }
          return {} as any;
        }
      );

      const promises: Promise<{ content: any[] }>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(executor.writeToTerminal(`echo "test ${i}"`));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.content[0].text).toContain(`echo "test ${index}"`);
      });
    }, 10000);
  });
});

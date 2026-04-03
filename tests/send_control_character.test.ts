import { execFile } from "child_process";
import SendControlCharacter from "../src/send_control_character";

// child_processモジュールをモック化
jest.mock("child_process");
const mockedExecFile = jest.mocked(execFile);

describe("SendControlCharacter", () => {
  let controlCharSender: SendControlCharacter;

  beforeEach(() => {
    controlCharSender = new SendControlCharacter();
    jest.clearAllMocks();
  });

  describe("send", () => {
    it("Ctrl+Cを正常に送信できること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("send-text");
          expect(args).toContain("--no-paste");
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await controlCharSender.send("c");

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("Sent control character: Ctrl+C");
    });

    it("Ctrl+Dを正常に送信できること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await controlCharSender.send("d");

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("Sent control character: Ctrl+D");
    });

    it("大文字の文字でも正常に動作すること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await controlCharSender.send("C");

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("Sent control character: Ctrl+C");
    });

    it("pane_idを指定して特定ペインに送信できること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("--pane-id");
          expect(args).toContain("3");
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await controlCharSender.send("c", 3);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe(
        "Sent control character: Ctrl+C to pane 3"
      );
    });

    it("pane_idを省略した場合はアクティブペインに送信すること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).not.toContain("--pane-id");
          callback(null, "", "");
          return {} as any;
        }
      );

      await controlCharSender.send("c");
    });

    it("サポートされていない制御文字の場合はエラーを投げること", async () => {
      await expect(controlCharSender.send("x")).rejects.toThrow(
        "Unknown control character: x"
      );
    });

    it("空文字の場合はエラーを投げること", async () => {
      await expect(controlCharSender.send("")).rejects.toThrow(
        "Unknown control character: "
      );
    });

    it("WezTermコマンド実行でエラーが発生した場合はエラーを投げること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(new Error("WezTerm not available"), null, null);
          return {} as any;
        }
      );

      await expect(controlCharSender.send("c")).rejects.toThrow(
        "Failed to send control character: WezTerm not available"
      );
    });

    // 全ての制御文字のマッピングをテスト
    const controlCharTests = [
      { char: "a", name: "Ctrl+A" },
      { char: "e", name: "Ctrl+E" },
      { char: "k", name: "Ctrl+K" },
      { char: "u", name: "Ctrl+U" },
      { char: "w", name: "Ctrl+W" },
      { char: "z", name: "Ctrl+Z" },
      { char: "l", name: "Ctrl+L" },
    ];

    controlCharTests.forEach(({ char, name }) => {
      it(`${name}を正常に送信できること`, async () => {
        mockedExecFile.mockImplementation(
          (file: string, args: any, callback: any) => {
            callback(null, "", "");
            return {} as any;
          }
        );

        const result = await controlCharSender.send(char);

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");
        expect(result.content[0].text).toBe(`Sent control character: ${name}`);
      });
    });
  });
});

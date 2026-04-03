import { execFile } from "child_process";
import WeztermExecutor from "../src/wezterm_executor";

// child_processモジュールをモック化
jest.mock("child_process");
const mockedExecFile = jest.mocked(execFile);

describe("WeztermExecutor", () => {
  let executor: WeztermExecutor;

  beforeEach(() => {
    executor = new WeztermExecutor();
    jest.clearAllMocks();
  });

  describe("writeToTerminal", () => {
    it("正常にコマンドを送信できること", async () => {
      const mockPaneInfo = "pane_id=1 active=true";
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          if (args.includes("list")) {
            callback(null, mockPaneInfo, "");
          } else if (args.includes("send-text")) {
            callback(null, "", "");
          }
          return {} as any;
        }
      );

      const result = await executor.writeToTerminal('echo "hello"');

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain(
        'Command sent to WezTerm: echo "hello"'
      );
      expect(result.content[0].text).toContain(mockPaneInfo);
    });

    it("スペースを含むコマンドが正しく渡されること", async () => {
      const mockPaneInfo = "pane_id=1 active=true";
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          if (args.includes("list")) {
            callback(null, mockPaneInfo, "");
          } else if (args.includes("send-text")) {
            // execFile uses array args, so spaces are preserved
            expect(args).toContain("echo hello world\n");
            callback(null, "", "");
          }
          return {} as any;
        }
      );

      await executor.writeToTerminal("echo hello world");
    });

    it("エラーが発生した場合にエラーメッセージを返すこと", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(new Error("WezTerm not running"), null, null);
          return {} as any;
        }
      );

      const result = await executor.writeToTerminal('echo "hello"');

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Failed to write to terminal");
      expect(result.content[0].text).toContain("WezTerm not running");
    });
  });

  describe("writeToSpecificPane", () => {
    it("指定されたペインにコマンドを送信できること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("--pane-id");
          expect(args).toContain("123");
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await executor.writeToSpecificPane("ls -la", 123);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("Command sent to pane 123: ls -la");
    });

    it("スペースを含むコマンドが正しくペインに送信されること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          // The command with spaces should be a single array element
          expect(args).toContain("echo hello from pane 0\n");
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await executor.writeToSpecificPane(
        "echo hello from pane 0",
        1
      );

      expect(result.content[0].text).toBe(
        "Command sent to pane 1: echo hello from pane 0"
      );
    });

    it("ペイン指定でエラーが発生した場合にエラーメッセージを返すこと", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(new Error("Pane not found"), null, null);
          return {} as any;
        }
      );

      const result = await executor.writeToSpecificPane("ls", 999);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Failed to write to pane 999");
      expect(result.content[0].text).toContain("Pane not found");
    });
  });

  describe("listPanes", () => {
    it("ペイン一覧を正常に取得できること", async () => {
      const mockPaneList = `pane_id=1 active=true title="Terminal"
pane_id=2 active=false title="Editor"`;

      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(file).toBe("wezterm");
          expect(args).toContain("list");
          callback(null, mockPaneList, "");
          return {} as any;
        }
      );

      const result = await executor.listPanes();

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe(mockPaneList);
    });

    it("ペイン一覧取得でエラーが発生した場合にエラーメッセージを返すこと", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(new Error("Connection failed"), null, null);
          return {} as any;
        }
      );

      const result = await executor.listPanes();

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Failed to list panes");
      expect(result.content[0].text).toContain("Connection failed");
    });
  });

  describe("switchPane", () => {
    it("指定されたペインに切り替えできること", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("activate-pane");
          expect(args).toContain("--pane-id");
          expect(args).toContain("42");
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await executor.switchPane(42);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("Switched to pane 42");
    });

    it("存在しないペインに切り替えようとした場合にエラーメッセージを返すこと", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(new Error("Pane does not exist"), null, null);
          return {} as any;
        }
      );

      const result = await executor.switchPane(999);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Failed to switch pane");
      expect(result.content[0].text).toContain("Pane does not exist");
      expect(result.content[0].text).toContain("pane ID 999");
    });
  });
});

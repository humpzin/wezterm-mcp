import { execFile } from "child_process";
import WeztermOutputReader from "../src/wezterm_output_reader";

// child_processモジュールをモック化
jest.mock("child_process");
const mockedExecFile = jest.mocked(execFile);

describe("WeztermOutputReader", () => {
  let outputReader: WeztermOutputReader;

  beforeEach(() => {
    outputReader = new WeztermOutputReader();
    jest.clearAllMocks();
  });

  describe("readOutput", () => {
    it("指定された行数の出力を正常に読み取れること", async () => {
      const mockOutput = "line1\nline2\nline3\n";
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("--start-line");
          expect(args).toContain("-50");
          callback(null, mockOutput, "");
          return {} as any;
        }
      );

      const result = await outputReader.readOutput(50);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe(mockOutput);
    });

    it("デフォルトで50行を読み取ること", async () => {
      const mockOutput = "default output";
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("--start-line");
          expect(args).toContain("-50");
          callback(null, mockOutput, "");
          return {} as any;
        }
      );

      const result = await outputReader.readOutput();

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe(mockOutput);
    });

    it("0以下の行数が指定された場合は全ての内容を取得すること", async () => {
      const mockOutput = "full screen content";
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).not.toContain("--start-line");
          callback(null, mockOutput, "");
          return {} as any;
        }
      );

      const result = await outputReader.readOutput(0);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe(mockOutput);
    });

    it("pane_idを指定して特定ペインの出力を読み取れること", async () => {
      const mockOutput = "pane 2 output";
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).toContain("--pane-id");
          expect(args).toContain("2");
          callback(null, mockOutput, "");
          return {} as any;
        }
      );

      const result = await outputReader.readOutput(50, 2);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe(mockOutput);
    });

    it("pane_idを省略した場合はアクティブペインから読み取ること", async () => {
      const mockOutput = "active pane output";
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          expect(args).not.toContain("--pane-id");
          callback(null, mockOutput, "");
          return {} as any;
        }
      );

      const result = await outputReader.readOutput(50);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe(mockOutput);
    });

    it('空の出力の場合は"(empty output)"を返すこと', async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(null, "", "");
          return {} as any;
        }
      );

      const result = await outputReader.readOutput(10);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("(empty output)");
    });

    it("エラーが発生した場合にエラーメッセージを返すこと", async () => {
      mockedExecFile.mockImplementation(
        (file: string, args: any, callback: any) => {
          callback(new Error("WezTerm connection failed"), null, null);
          return {} as any;
        }
      );

      const result = await outputReader.readOutput(20);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain(
        "Failed to read terminal output"
      );
      expect(result.content[0].text).toContain("WezTerm connection failed");
      expect(result.content[0].text).toContain("wezterm cli list");
    });
  });
});

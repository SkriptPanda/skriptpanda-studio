import { useEffect, useMemo, useRef } from "react";
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react";
import type * as monacoTypes from "monaco-editor";
import { FileLeaf } from "@/lib/fs";

let skriptCompletionRegistered = false;

export type EditorPaneProps = {
  file: FileLeaf | null;
  onChange: (value: string) => void;
  themeKey: "dark" | "light";
  onCursorChange?: (pos: { line: number; column: number }) => void;
};

export function EditorPane({ file, onChange, themeKey, onCursorChange }: EditorPaneProps) {
  const monacoRef = useRef<monacoTypes.editor.IStandaloneCodeEditor | null>(null);

  const language = useMemo(() => {
    if (!file) return "plaintext";
    if (file.name.endsWith(".sk")) return "skript";
    if (file.name.endsWith(".md")) return "markdown";
    if (file.name.endsWith(".json")) return "json";
    return "plaintext";
  }, [file]);

  const beforeMount: BeforeMount = (monaco) => {
    if (!monaco.languages.getLanguages().some((l) => l.id === "skript")) {
      monaco.languages.register({ id: "skript" });
      monaco.languages.setMonarchTokensProvider("skript", {
        tokenizer: {
          root: [
            [/^\s*#.*/, "comment"],
            [/\b(command|trigger|if|else|loop|set|to|send|message|player|event|function|return|stop)\b/, "keyword"],
            [/\b(true|false|null)\b/, "constant"],
            [/\d+/, "number"],
            [/"[^"]*"/, "string"],
            [/'[^']*'/, "string"],
            [/\/[a-zA-Z\-]+/, "type"], // commands like /hello
          ],
        },
      } as any);
    }

    if (!skriptCompletionRegistered) {
      skriptCompletionRegistered = true;
      const keywords = [
        "command", "trigger", "if", "else", "loop", "set", "to", "send", "message", "player", "event", "function", "return", "stop",
      ];
      const snippets = [
        {
          label: "command",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'command /${1:name}:\n  trigger:\n    message "${2:text}"',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Skript command template",
        },
        {
          label: "if",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if ${1:condition}:\n  ${2:action}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "If statement",
        },
      ];
      monaco.languages.registerCompletionItemProvider("skript", {
        triggerCharacters: ["/", " ", "\n"],
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const keywordSuggestions = keywords.map((k) => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range,
          }));
          const snippetSuggestions = snippets.map((s) => ({ ...s, range }));
          return { suggestions: [...snippetSuggestions, ...keywordSuggestions] };
        },
      });
    }

    monaco.editor.defineTheme("skriptpanda-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "ff9800" },
        { token: "type", foreground: "7aa2f7" },
        { token: "string", foreground: "9cdcfe" },
        { token: "comment", foreground: "6a9955" },
        { token: "number", foreground: "b5cea8" },
      ],
      colors: {
        "editor.background": "#0b1020",
        "editorLineNumber.foreground": "#5a6b8a",
        "editorCursor.foreground": "#ff9800",
        "editor.selectionBackground": "#264f78",
      },
    });

    monaco.editor.defineTheme("skriptpanda-light", {
      base: "vs",
      inherit: true,
      rules: [{ token: "keyword", foreground: "d97706" }],
      colors: {
        "editorCursor.foreground": "#ff9800",
      },
    });
  };

  const onMount: OnMount = (editor, monaco) => {
    monacoRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({ line: e.position.lineNumber, column: e.position.column });
    });
  };

  useEffect(() => {
    return () => {
      monacoRef.current?.dispose();
    };
  }, []);

  const value = file?.content ?? "";

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        beforeMount={beforeMount}
        onMount={onMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          smoothScrolling: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
        theme={themeKey === "dark" ? "skriptpanda-dark" : "skriptpanda-light"}
      />
    </div>
  );
}

import { useEffect, useMemo, useRef } from "react";
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react";
import type * as monacoTypes from "monaco-editor";
import { FileLeaf } from "@/lib/fs";

let skriptCompletionRegistered = false;

export type EditorPaneProps = {
  file: FileLeaf | null;
  onChange: (value: string) => void;
  themeKey: string;
  onCursorChange?: (pos: { line: number; column: number }) => void;
};

function getMonacoTheme(themeKey: string) {
  switch (themeKey) {
    case "sp-dark": return "skriptpanda-dark";
    case "sp-light": return "skriptpanda-light";
    case "dracula": return "dracula";
    case "solarized": return "solarized-light";
    default: return "skriptpanda-dark";
  }
}

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
            [/\b(on|every|at|command|trigger|if|else|loop|set|to|send|message|player|event|function|return|stop|while|parse|add|remove|delete|clear|wait|teleport|kill|heal|damage|broadcast|execute|cancel|give|take)\b/, "keyword"],
            [/\b(true|false|null|yes|no)\b/, "constant"],
            [/\b(damage|death|join|quit|chat|click|break|place|respawn|move|drop|pickup|inventory|craft|consume|target|shoot|hit|world|region|time|weather)\b/, "event"],
            [/\d+/, "number"],
            [/"[^"]*"/, "string"],
            [/'[^']*'/, "string"],
            [/\/[a-zA-Z\-]+/, "type"], // commands like /hello
            [/:$/, "colon"], // colon at end of line
          ],
        },
      } as any);

      // Configure language settings for proper indentation
      monaco.languages.setLanguageConfiguration("skript", {
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')']
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        indentationRules: {
          increaseIndentPattern: /.*:$/,
          decreaseIndentPattern: /^\s*(else|elif).*$/
        },
        onEnterRules: [
          {
            beforeText: /.*:$/,
            action: { indentAction: monaco.languages.IndentAction.Indent }
          }
        ]
      });
    }

    if (!skriptCompletionRegistered) {
      skriptCompletionRegistered = true;
      const keywords = [
        "command", "trigger", "if", "else", "loop", "set", "to", "send", "message", "player", "event", "function", "return", "stop", "on", "every", "at", "while", "parse", "add", "remove", "delete", "clear", "wait", "teleport", "kill", "heal", "damage", "broadcast", "execute", "cancel", "give", "take"
      ];
      const snippets = [
        {
          label: "command",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'command /${1:name}:\n\ttrigger:\n\t\t${2:# Your command code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Skript command template with proper indentation",
        },
        {
          label: "on damage",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'on damage:\n\t${1:# Event code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Damage event with proper indentation",
        },
        {
          label: "on death",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'on death:\n\t${1:# Event code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Death event with proper indentation",
        },
        {
          label: "on join",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'on join:\n\t${1:# Event code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Join event with proper indentation",
        },
        {
          label: "on quit",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'on quit:\n\t${1:# Event code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Quit event with proper indentation",
        },
        {
          label: "on chat",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'on chat:\n\t${1:# Event code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Chat event with proper indentation",
        },
        {
          label: "if",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if ${1:condition}:\n\t${2:# Action here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "If statement with proper indentation",
        },
        {
          label: "loop",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'loop ${1:times}:\n\t${2:# Loop code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Loop statement with proper indentation",
        },
        {
          label: "function",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'function ${1:name}(${2:parameters}):\n\t${3:# Function code here}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Function definition with proper indentation",
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
        { token: "event", foreground: "7aa2f7" },
        { token: "type", foreground: "7aa2f7" },
        { token: "string", foreground: "9cdcfe" },
        { token: "comment", foreground: "6a9955" },
        { token: "number", foreground: "b5cea8" },
        { token: "colon", foreground: "ff9800" },
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
      rules: [
        { token: "keyword", foreground: "d97706" },
        { token: "event", foreground: "0f4c75" },
        { token: "type", foreground: "0f4c75" },
        { token: "string", foreground: "059669" },
        { token: "comment", foreground: "6b7280" },
        { token: "number", foreground: "7c3aed" },
        { token: "colon", foreground: "ff9800" },
      ],
      colors: {
        "editorCursor.foreground": "#ff9800",
        "editor.background": "#fefefe",
        "editorLineNumber.foreground": "#9ca3af",
      },
    });

    monaco.editor.defineTheme("dracula", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "ff79c6" }, // Pink
        { token: "event", foreground: "8be9fd" }, // Cyan
        { token: "type", foreground: "8be9fd" }, // Cyan
        { token: "string", foreground: "f1fa8c" }, // Yellow
        { token: "comment", foreground: "6272a4" }, // Purple-gray
        { token: "number", foreground: "bd93f9" }, // Purple
        { token: "colon", foreground: "ff79c6" }, // Pink
      ],
      colors: {
        "editor.background": "#282a36",
        "editorLineNumber.foreground": "#6272a4",
        "editorCursor.foreground": "#f8f8f2",
        "editor.selectionBackground": "#44475a",
        "editor.foreground": "#f8f8f2",
      },
    });

    monaco.editor.defineTheme("solarized-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "859900" }, // Green
        { token: "event", foreground: "268bd2" }, // Blue
        { token: "type", foreground: "268bd2" }, // Blue
        { token: "string", foreground: "2aa198" }, // Cyan
        { token: "comment", foreground: "93a1a1" }, // Base1
        { token: "number", foreground: "d33682" }, // Magenta
        { token: "colon", foreground: "cb4b16" }, // Orange
      ],
      colors: {
        "editor.background": "#fdf6e3",
        "editorLineNumber.foreground": "#93a1a1",
        "editorCursor.foreground": "#657b83",
        "editor.selectionBackground": "#eee8d5",
        "editor.foreground": "#657b83",
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
        theme={getMonacoTheme(themeKey)}
      />
    </div>
  );
}

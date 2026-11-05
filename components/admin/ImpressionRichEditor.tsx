"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Highlighter,
  Eye,
  Code2,
  List,
  ListOrdered,
} from "lucide-react";

import ImpressionFormattedText from "@/components/dashboard/ImpressionFormattedText";

const colors = [
  ["Default", "default"],
  ["Red", "red"],
  ["Amber", "amber"],
  ["Blue", "blue"],
  ["Green", "green"],
  ["Purple", "purple"],
] as const;

const sizes = [12, 14, 16, 18, 20, 24] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  singleLine?: boolean;
  placeholder?: string;
};

type SelectionRange = {
  start: number;
  end: number;
};

export default function ImpressionRichEditor({
  value,
  onChange,
  maxLength,
  singleLine = false,
  placeholder,
}: Props) {
  // Shared reference for both title input and description textarea.
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const selectionRef = useRef<SelectionRange>({
    start: 0,
    end: 0,
  });

  const [preview, setPreview] = useState(true);

  // Remember the selected text, even when focus moves to toolbar.
  const rememberSelection = () => {
    const field = inputRef.current;
    if (!field) return;

    selectionRef.current = {
      start: field.selectionStart ?? 0,
      end: field.selectionEnd ?? 0,
    };
  };

  // Restore focus and selection after a formatting operation.
  const restoreSelection = (start: number, end: number) => {
    selectionRef.current = { start, end };

    requestAnimationFrame(() => {
      const field = inputRef.current;
      if (!field) return;

      field.focus();
      field.setSelectionRange(start, end);
    });
  };

  // Apply inline formatting to selected text.
  const wrap = (before: string, after: string = before) => {
    const field = inputRef.current;
    if (!field) return;

    const { start, end } = selectionRef.current;

    const safeStart = Math.max(0, Math.min(start, value.length));

    const safeEnd = Math.max(safeStart, Math.min(end, value.length));

    const selected = value.slice(safeStart, safeEnd) || "text";

    const updatedValue =
      value.slice(0, safeStart) +
      before +
      selected +
      after +
      value.slice(safeEnd);

    if (maxLength !== undefined && updatedValue.length > maxLength) {
      return;
    }

    onChange(updatedValue);

    restoreSelection(
      safeStart + before.length,
      safeStart + before.length + selected.length,
    );
  };

  // Convert selected lines into bullet or numbered list.
  const insertList = (ordered: boolean) => {
    if (singleLine) return;

    const field = inputRef.current;
    if (!field) return;

    const { start, end } = selectionRef.current;

    const safeStart = Math.max(0, Math.min(start, value.length));

    const safeEnd = Math.max(safeStart, Math.min(end, value.length));

    // Locate the first complete selected line.
    const lineStart = value.lastIndexOf("\n", safeStart - 1) + 1;

    // Avoid including an extra line when selection ends
    // exactly at the beginning of the next line.
    const lastSelectedPosition =
      safeEnd > safeStart && value[safeEnd - 1] === "\n"
        ? safeEnd - 1
        : safeEnd;

    const nextBreak = value.indexOf("\n", lastSelectedPosition);

    const lineEnd = nextBreak === -1 ? value.length : nextBreak;

    const selectedText = value.slice(lineStart, lineEnd);

    const formatted = selectedText
      .split("\n")
      .map((line, index) => {
        // Remove existing Markdown list markers.
        const content = line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, "");

        return ordered ? `${index + 1}. ${content}` : `- ${content}`;
      })
      .join("\n");

    const updatedValue =
      value.slice(0, lineStart) + formatted + value.slice(lineEnd);

    if (maxLength !== undefined && updatedValue.length > maxLength) {
      return;
    }

    onChange(updatedValue);

    restoreSelection(lineStart, lineStart + formatted.length);
  };

  const inputClasses =
    "w-full rounded-lg border border-slate-700 bg-[#091525] px-3 py-3 text-sm text-white outline-none focus:border-blue-500";

  const toolbarButtonClasses =
    "rounded-md border border-slate-600 p-2 text-slate-200 hover:bg-slate-700";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#0a1729]">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-700 p-2">
        {/* Bold */}
        <button
          type="button"
          title="Bold"
          aria-label="Bold selected text"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrap("**")}
          className={toolbarButtonClasses}
        >
          <Bold size={15} />
        </button>

        {/* Italic */}
        <button
          type="button"
          title="Italic"
          aria-label="Italic selected text"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrap("*")}
          className={toolbarButtonClasses}
        >
          <Italic size={15} />
        </button>

        {/* Highlight */}
        <button
          type="button"
          title="Highlight"
          aria-label="Highlight selected text"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrap("==", "==")}
          className={toolbarButtonClasses}
        >
          <Highlighter size={15} />
        </button>

        {/* Text Color */}
        <select
          aria-label="Text color"
          defaultValue="default"
          onChange={(event) => {
            const selectedColor = event.target.value;

            if (selectedColor !== "default") {
              wrap(`[color:${selectedColor}]`, "[/color]");
            }

            event.target.value = "default";
          }}
          className="h-9 rounded-md border border-slate-600 bg-[#091525] px-2 text-xs text-white"
        >
          {colors.map(([name, code]) => (
            <option key={code} value={code}>
              {name} text
            </option>
          ))}
        </select>

        {/* Font Size */}
        <select
          aria-label="Font size"
          defaultValue=""
          onChange={(event) => {
            const selectedSize = event.target.value;

            if (selectedSize) {
              wrap(`[size:${selectedSize}]`, "[/size]");
            }

            event.target.value = "";
          }}
          className="h-9 rounded-md border border-slate-600 bg-[#091525] px-2 text-xs text-white"
        >
          <option value="">Font size</option>

          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>

        {/* Bulleted List */}
        <button
          type="button"
          title="Bulleted list"
          aria-label="Bulleted list"
          disabled={singleLine}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insertList(false)}
          className={`${toolbarButtonClasses} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <List size={18} />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          title="Numbered list"
          aria-label="Numbered list"
          disabled={singleLine}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insertList(true)}
          className={`${toolbarButtonClasses} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <ListOrdered size={18} />
        </button>

        {/* Preview Toggle */}
        <button
          type="button"
          title="Toggle preview"
          aria-label="Toggle formatting preview"
          onClick={() => setPreview((previous) => !previous)}
          className="ml-auto flex items-center gap-1 rounded-md border border-slate-600 px-2 py-2 text-xs text-slate-200 hover:bg-slate-700"
        >
          {preview ? <Code2 size={15} /> : <Eye size={15} />}

          {preview ? "Hide preview" : "Preview"}
        </button>
      </div>

      {/* Editor Input */}
      <div className="p-2">
        {singleLine ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className={inputClasses}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onSelect={rememberSelection}
            onKeyUp={rememberSelection}
            onMouseUp={rememberSelection}
            onClick={rememberSelection}
            onChange={(event) => {
              onChange(event.target.value);
              rememberSelection();
            }}
          />
        ) : (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={inputClasses}
            rows={5}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onSelect={rememberSelection}
            onKeyUp={rememberSelection}
            onMouseUp={rememberSelection}
            onClick={rememberSelection}
            onChange={(event) => {
              onChange(event.target.value);
              rememberSelection();
            }}
          />
        )}

        {/* Character Counter */}
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>
            Select text, then apply formatting. Save scenario to persist.
          </span>

          <span>
            {value.length}
            {maxLength ? ` / ${maxLength}` : ""}
          </span>
        </div>

        {/* Live Preview */}
        {preview && (
          <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 text-slate-900">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Preview
            </p>

            <ImpressionFormattedText value={value} inline={singleLine} />
          </div>
        )}
      </div>
    </div>
  );
}

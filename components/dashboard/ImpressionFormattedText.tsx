"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Root, RootContent, PhrasingContent } from "mdast";
import type { Plugin } from "unified";

const colors: Record<string, string> = {
  red: "#b91c1c",
  amber: "#92400e",
  blue: "#1d4ed8",
  green: "#15803d",
  purple: "#7e22ce",
};

const sizes = new Set([12, 14, 16, 18, 20, 24]);

type Marker = {
  type: "color" | "size" | "highlight";
  value?: string;
};

type TextNode = {
  type: "text";
  value: string;
};

type StyledNode = {
  type: "styledSpan";
  children: InlineNode[];
  data: {
    hName: "span";
    hProperties: {
      style: string;
    };
  };
};

type InlineNode = TextNode | StyledNode;

const tokenPattern = /(==|\[\/?(?:color|size)(?::[^\]\n]+)?\])/g;

function getStyle(marker: Marker): string {
  if (marker.type === "highlight") {
    return [
      "background-color:#fef08a",
      "color:#713f12",
      "font-weight:700",
      "border-radius:2px",
    ].join(";");
  }

  if (marker.type === "color") {
    return `color:${colors[marker.value ?? ""]}`;
  }

  return `font-size:${Number(marker.value)}px`;
}

function getOpeningMarker(token: string): Marker | null {
  if (token === "==") {
    return { type: "highlight" };
  }

  const color = token.match(/^\[color:([a-z]+)\]$/);

  if (color && colors[color[1]]) {
    return {
      type: "color",
      value: color[1],
    };
  }

  const size = token.match(/^\[size:(\d+)\]$/);

  if (size && sizes.has(Number(size[1]))) {
    return {
      type: "size",
      value: size[1],
    };
  }

  return null;
}

function parseStyledText(value: string): InlineNode[] {
  const root: InlineNode[] = [];

  const stack: Array<{
    marker: Marker | null;
    children: InlineNode[];
  }> = [{ marker: null, children: root }];

  let last = 0;

  function appendText(text: string) {
    if (!text) return;

    stack[stack.length - 1].children.push({
      type: "text",
      value: text,
    });
  }

  for (const match of value.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    const token = match[0];

    appendText(value.slice(last, index));

    const current = stack[stack.length - 1].marker;

    const closingType =
      token === "==" && current?.type === "highlight"
        ? "highlight"
        : token === "[/color]"
          ? "color"
          : token === "[/size]"
            ? "size"
            : null;

    if (closingType && current?.type === closingType && stack.length > 1) {
      stack.pop();
    } else {
      const opening = getOpeningMarker(token);

      if (opening) {
        const node: StyledNode = {
          type: "styledSpan",
          children: [],
          data: {
            hName: "span",
            hProperties: {
              style: getStyle(opening),
            },
          },
        };

        stack[stack.length - 1].children.push(node);

        stack.push({
          marker: opening,
          children: node.children,
        });
      } else {
        appendText(token);
      }
    }

    last = index + token.length;
  }

  appendText(value.slice(last));

  return root;
}

// Remark plugin: transform styling markers within text nodes.
// Markdown itself is parsed as a complete document first.
const remarkImpressionStyles: Plugin<[], Root> = () => {
  return (tree) => {
    function transform(node: Root | RootContent | PhrasingContent) {
      if (!("children" in node) || !Array.isArray(node.children)) {
        return;
      }

      const children = node.children as Array<RootContent | PhrasingContent>;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.type === "text" && tokenPattern.test(child.value)) {
          tokenPattern.lastIndex = 0;

          const parts = parseStyledText(child.value);

          children.splice(i, 1, ...(parts as unknown as PhrasingContent[]));

          i += parts.length - 1;
        } else {
          transform(child);
        }

        tokenPattern.lastIndex = 0;
      }
    }

    transform(tree);
  };
};

function normalize(value: string): string {
  return (value ?? "").replace(/<\/?text\b[^>]*>/gi, "").trim();
}

export function plainImpressionText(value: string): string {
  return normalize(value)
    .replace(/\[\/?(?:color|size)(?::[^\]\n]+)?\]/g, "")
    .replace(/==/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__|~~)/g, "")
    .replace(/[`*_]/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ImpressionFormattedText({
  value,
  inline = false,
}: {
  value: string;
  inline?: boolean;
}) {
  const cleaned = normalize(value);

  const content = (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkImpressionStyles]}
      components={{
        p: ({ children }) =>
          inline ? (
            <span>{children}</span>
          ) : (
            <p className="mb-2 last:mb-0">{children}</p>
          ),

        strong: ({ children }) => (
          <strong className="font-bold">{children}</strong>
        ),

        em: ({ children }) => <em className="italic">{children}</em>,

        del: ({ children }) => <del className="line-through">{children}</del>,

        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
        ),

        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
        ),

        li: ({ children }) => <li className="pl-1">{children}</li>,
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );

  return inline ? (
    <span className="whitespace-pre-wrap">{content}</span>
  ) : (
    <div className="whitespace-pre-wrap">{content}</div>
  );
}

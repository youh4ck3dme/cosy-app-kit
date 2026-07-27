import type { RawNode, NodeType, InputType, ActionType } from "./types";

export class HTMLAdapterEngine {
  /**
   * Converts an HTML string into a clean RawNode AST tree.
   */
  public parseHTMLString(htmlString: string): RawNode[] {
    if (!htmlString || !htmlString.trim()) {
      return [];
    }

    // Prefer global DOMParser when available (browser / happy-dom)
    const ParserCtor =
      typeof DOMParser !== "undefined"
        ? DOMParser
        : typeof window !== "undefined" && typeof window.DOMParser !== "undefined"
          ? window.DOMParser
          : null;

    if (ParserCtor) {
      try {
        const parser = new ParserCtor();
        const doc = parser.parseFromString(htmlString, "text/html");
        const nodes: RawNode[] = [];

        Array.from(doc.body.children).forEach((child) => {
          nodes.push(this.traverseDOMNode(child as HTMLElement));
        });

        if (nodes.length > 0) return nodes;
      } catch (err) {
        console.warn("[HTMLAdapterEngine] DOMParser failed, using fallback parser:", err);
      }
    }

    // Node environment / Fallback simple parser
    return this.fallbackParse(htmlString);
  }

  private traverseDOMNode(element: HTMLElement): RawNode {
    const tagName = element.tagName.toLowerCase();
    const className = element.className || undefined;
    const id = element.id || `node_${Math.random().toString(36).substring(2, 7)}`;

    // Text content extraction (only direct text if single child text node, or combined)
    const directText =
      element.childNodes.length === 1 && element.childNodes[0].nodeType === 3
        ? element.textContent?.trim()
        : element.children.length === 0
          ? element.textContent?.trim()
          : undefined;

    const { type, inputType, action } = this.classifyHTMLElement(element, tagName);

    const children: RawNode[] = [];
    Array.from(element.children).forEach((child) => {
      children.push(this.traverseDOMNode(child as HTMLElement));
    });

    const meta: Record<string, string | number | boolean | null> = {
      tagName,
    };

    if (element.getAttribute("src")) {
      meta.imgSrc = element.getAttribute("src");
      meta.isImage = true;
    }
    if (element.getAttribute("alt")) {
      meta.alt = element.getAttribute("alt");
    }
    if (element.getAttribute("aria-label")) {
      meta["aria-label"] = element.getAttribute("aria-label");
    }

    return {
      id,
      type,
      text: directText || undefined,
      inputType,
      action,
      className: className || undefined,
      children: children.length > 0 ? children : undefined,
      meta,
    };
  }

  private classifyHTMLElement(
    element: HTMLElement,
    tagName: string,
  ): { type: NodeType; inputType?: InputType; action?: ActionType } {
    if (tagName === "button" || element.getAttribute("role") === "button") {
      const typeAttr = element.getAttribute("type");
      const action: ActionType = typeAttr === "submit" ? "submit" : "navigate";
      return { type: "button", action };
    }

    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
      const rawInputType = element.getAttribute("type") || "text";
      const inputType: InputType =
        rawInputType === "email"
          ? "email"
          : rawInputType === "password"
            ? "password"
            : rawInputType === "number"
              ? "number"
              : "text";
      return { type: "input", inputType };
    }

    if (tagName === "ul" || tagName === "ol" || tagName === "nav") {
      return { type: "list" };
    }

    if (
      [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "span",
        "a",
        "label",
        "b",
        "strong",
        "em",
        "i",
      ].includes(tagName)
    ) {
      return { type: "text" };
    }

    return { type: "box" };
  }

  private fallbackParse(htmlString: string): RawNode[] {
    // Regex fallback for Node/Bun without DOMParser ([\s\S] crosses newlines)
    const cleanHTML = htmlString.replace(/```html|```/g, "").trim();
    return this.parseTopLevelTags(cleanHTML);
  }

  /** Parse top-level tags only so nested trees become children, not siblings. */
  private parseTopLevelTags(html: string): RawNode[] {
    const nodes: RawNode[] = [];
    const tagRe = /<([a-z][a-z0-9]*)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
    let match: RegExpExecArray | null;
    let cursor = 0;

    while ((match = tagRe.exec(html)) !== null) {
      // Skip matches nested inside a previous top-level match
      if (match.index < cursor) continue;

      const [full, tag, attrs, innerContent] = match;
      const classMatch = attrs.match(/class\s*=\s*["']([^"']+)["']/i);
      const className = classMatch ? classMatch[1] : undefined;
      const tagName = tag.toLowerCase();

      let type: NodeType = "box";
      let inputType: InputType | undefined;
      let action: ActionType | undefined;

      if (tagName === "button") {
        type = "button";
        action = /type\s*=\s*["']submit["']/i.test(attrs) ? "submit" : "navigate";
      } else if (tagName === "input") {
        type = "input";
        const raw = (attrs.match(/type\s*=\s*["']([^"']+)["']/i)?.[1] || "text").toLowerCase();
        inputType =
          raw === "email" || raw === "password" || raw === "number" ? (raw as InputType) : "text";
      } else if (["ul", "ol", "nav"].includes(tagName)) {
        type = "list";
      } else if (
        ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "label", "b", "strong", "em", "i"].includes(
          tagName,
        )
      ) {
        type = "text";
      }

      const childNodes = this.parseTopLevelTags(innerContent.trim());
      const textOnly =
        childNodes.length === 0
          ? innerContent.replace(/<[^>]+>/g, "").trim() || undefined
          : undefined;

      nodes.push({
        id: `node_${nodes.length}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        text: textOnly,
        className,
        inputType,
        action,
        children: childNodes.length > 0 ? childNodes : undefined,
        meta: { tagName },
      });

      cursor = match.index + full.length;
      // Continue search after this top-level element
      tagRe.lastIndex = cursor;
    }

    if (nodes.length === 0 && html.trim()) {
      return [
        {
          id: `node_${Math.random().toString(36).substring(2, 7)}`,
          type: "box",
          text: html.replace(/<[^>]+>/g, "").trim() || html.trim(),
          className: "p-4",
        },
      ];
    }

    return nodes;
  }
}

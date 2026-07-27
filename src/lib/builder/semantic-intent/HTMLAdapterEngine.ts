import type { RawNode, NodeType, InputType, ActionType } from "./types";

export class HTMLAdapterEngine {
  /**
   * Converts an HTML string into a clean RawNode AST tree.
   */
  public parseHTMLString(htmlString: string): RawNode[] {
    if (!htmlString || !htmlString.trim()) {
      return [];
    }

    // In Browser or DOMParser environment
    if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
      try {
        const parser = new DOMParser();
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
    // Regex-based simple fallback for Node environment tests
    const cleanHTML = htmlString.replace(/```html|```/g, "").trim();
    const tagMatches = cleanHTML.match(/<([a-z1-6]+)([^>]*)>(.*?)<\/\1>/gi);

    if (!tagMatches) {
      return [
        {
          id: `node_${Math.random().toString(36).substring(2, 7)}`,
          type: "box",
          text: cleanHTML,
          className: "p-4",
        },
      ];
    }

    return tagMatches.map((match, idx) => {
      const tagMatch = match.match(/<([a-z1-6]+)([^>]*)>(.*?)<\/\1>/i);
      if (!tagMatch) {
        return { id: `node_${idx}`, type: "box", text: match };
      }

      const [, tag, attrs, innerContent] = tagMatch;
      const classMatch = attrs.match(/class=["']([^"']+)["']/i);
      const className = classMatch ? classMatch[1] : undefined;

      const tagName = tag.toLowerCase();
      let type: NodeType = "box";
      if (tagName === "button") type = "button";
      else if (tagName === "input") type = "input";
      else if (["ul", "ol", "nav"].includes(tagName)) type = "list";
      else if (["h1", "h2", "h3", "p", "span", "a"].includes(tagName)) type = "text";

      return {
        id: `node_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        text: innerContent.replace(/<[^>]+>/g, "").trim() || undefined,
        className,
      };
    });
  }
}

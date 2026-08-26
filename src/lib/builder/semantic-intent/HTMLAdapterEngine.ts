import type { RawNode, NodeType, InputType, ActionType } from "./types";

/** HTML void elements — no closing tag, may appear as `<tag>` or `<tag />`. */
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

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
    let i = 0;

    while (i < html.length) {
      while (i < html.length && /\s/.test(html[i])) i++;
      if (i >= html.length) break;

      if (html[i] !== "<") {
        i++;
        continue;
      }

      const parsed = this.parseTagAt(html, i);
      if (!parsed) {
        i++;
        continue;
      }

      nodes.push(parsed.node);
      i = parsed.nextIndex;
    }

    if (nodes.length === 0 && html.trim()) {
      return [this.createFallbackTextNode(html)];
    }

    return nodes;
  }

  private parseTagAt(
    html: string,
    start: number,
  ): { node: RawNode; nextIndex: number } | null {
    const slice = html.slice(start);
    const openMatch = slice.match(/^<([a-z][a-z0-9]*)\b([^>]*?)(\/?)>/i);
    if (!openMatch) return null;

    const [fullOpen, tag, attrs, selfCloseSlash] = openMatch;
    const tagName = tag.toLowerCase();
    let i = start + fullOpen.length;

    const isSelfClosing = selfCloseSlash === "/" || VOID_ELEMENTS.has(tagName);
    if (isSelfClosing) {
      return { node: this.createNodeFromTag(tagName, attrs, ""), nextIndex: i };
    }

    const closeTag = `</${tagName}>`;
    let depth = 1;
    const contentStart = i;

    while (i < html.length && depth > 0) {
      const lt = html.indexOf("<", i);
      if (lt === -1) break;

      const rest = html.slice(lt);
      const restLower = rest.toLowerCase();

      if (restLower.startsWith(closeTag)) {
        depth--;
        if (depth === 0) {
          const innerContent = html.slice(contentStart, lt);
          const childNodes = this.parseTopLevelTags(innerContent.trim());
          return {
            node: this.createNodeFromTag(tagName, attrs, innerContent, childNodes),
            nextIndex: lt + closeTag.length,
          };
        }
        i = lt + closeTag.length;
        continue;
      }

      const nestedOpen = rest.match(/^<([a-z][a-z0-9]*)\b([^>]*?)(\/?)>/i);
      if (nestedOpen && nestedOpen[1].toLowerCase() === tagName) {
        const nestedVoid =
          nestedOpen[3] === "/" || VOID_ELEMENTS.has(nestedOpen[1].toLowerCase());
        if (!nestedVoid) depth++;
      }

      i = lt + 1;
    }

    const innerContent = html.slice(contentStart);
    const childNodes = this.parseTopLevelTags(innerContent.trim());
    return {
      node: this.createNodeFromTag(tagName, attrs, innerContent, childNodes),
      nextIndex: html.length,
    };
  }

  private createNodeFromTag(
    tagName: string,
    attrs: string,
    innerContent: string,
    parsedChildren?: RawNode[],
  ): RawNode {
    const classMatch = attrs.match(/class\s*=\s*["']([^"']+)["']/i);
    const className = classMatch ? classMatch[1] : undefined;

    const { type, inputType, action } = this.classifyTag(tagName, attrs);
    const children =
      parsedChildren ??
      (innerContent.trim() ? this.parseTopLevelTags(innerContent.trim()) : []);
    const textOnly =
      children.length === 0
        ? innerContent.replace(/<[^>]+>/g, "").trim() || undefined
        : undefined;

    const meta: Record<string, string | number | boolean | null> = { tagName };

    if (tagName === "img") {
      const src = attrs.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
      const alt = attrs.match(/alt\s*=\s*["']([^"']+)["']/i)?.[1];
      if (src) {
        meta.imgSrc = src;
        meta.isImage = true;
      }
      if (alt) meta.alt = alt;
    }

    const ariaLabel = attrs.match(/aria-label\s*=\s*["']([^"']+)["']/i)?.[1];
    if (ariaLabel) meta["aria-label"] = ariaLabel;

    return {
      id: `node_${Math.random().toString(36).substring(2, 7)}`,
      type,
      text: textOnly,
      className,
      inputType,
      action,
      children: children.length > 0 ? children : undefined,
      meta,
    };
  }

  private classifyTag(
    tagName: string,
    attrs: string,
  ): { type: NodeType; inputType?: InputType; action?: ActionType } {
    if (tagName === "button" || /role\s*=\s*["']button["']/i.test(attrs)) {
      const action: ActionType = /type\s*=\s*["']submit["']/i.test(attrs) ? "submit" : "navigate";
      return { type: "button", action };
    }

    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
      const raw = (attrs.match(/type\s*=\s*["']([^"']+)["']/i)?.[1] || "text").toLowerCase();
      const inputType: InputType =
        raw === "email" || raw === "password" || raw === "number" ? (raw as InputType) : "text";
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

  private createFallbackTextNode(html: string): RawNode {
    return {
      id: `node_${Math.random().toString(36).substring(2, 7)}`,
      type: "box",
      text: html.replace(/<[^>]+>/g, "").trim() || html.trim(),
      className: "p-4",
    };
  }
}

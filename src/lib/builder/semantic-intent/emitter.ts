import type { SmartNode, IntentType, EngineResult } from "./types";

export class CodeEmitter {
  public emit(componentName: string, intent: IntentType, nodes: SmartNode[]): EngineResult {
    let stateDeclarations = "";
    let componentBody = "";

    if (intent === "FormIntent") {
      const { stateStr, bodyStr } = this.emitForm(nodes);
      stateDeclarations = stateStr;
      componentBody = bodyStr;
    } else {
      componentBody = this.emitStatic(nodes);
    }

    const code = `import React${intent === "FormIntent" ? ", { useState }" : ""} from 'react';

export default function ${componentName}() {
${stateDeclarations}

${componentBody}
}`;

    return {
      componentName,
      code,
      intent,
    };
  }

  private emitForm(nodes: SmartNode[]): { stateStr: string; bodyStr: string } {
    const flattenSmartNodes = (items: SmartNode[]): SmartNode[] => {
      const result: SmartNode[] = [];
      for (const item of items) {
        result.push(item);
        if (item.children && item.children.length > 0) {
          result.push(...flattenSmartNodes(item.children));
        }
      }
      return result;
    };

    const allNodes = flattenSmartNodes(nodes);
    const inputNodes = allNodes.filter((n) => n.type === "input" && n.stateKey);
    const stateFields = inputNodes.map((n) => `    ${n.stateKey}: ''`).join(",\n");

    const stateStr = `  const [formData, setFormData] = useState({
${stateFields}
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // TODO: Add API call
  };`;

    const jsxElements = allNodes
      .map((node) => {
        if (node.type === "input") {
          const rawClass = node.className ? ` ${node.className}` : "";
          return `      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">${node.label || "Field"}</label>
        <input 
          type="${node.inputType || "text"}" 
          name="${node.name}"
          value={formData.${node.stateKey}}
          onChange={handleChange}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all${rawClass}"
          required
        />
      </div>`;
        }
        if (node.type === "button") {
          const rawClass = node.className ? ` ${node.className}` : "";
          return `      <button 
        type="${node.action === "submit" ? "submit" : "button"}" 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors mt-2${rawClass}"
      >
        ${node.text || "Submit"}
      </button>`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");

    const bodyStr = `  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-xl shadow-sm border flex flex-col gap-4 max-w-md w-full mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Form</h2>
${jsxElements}
    </form>
  );`;

    return { stateStr, bodyStr };
  }

  private emitStatic(nodes: SmartNode[]): string {
    const jsxElements = nodes
      .map((node) => {
        if (node.type === "text") {
          return `      <p className="${node.className || "text-gray-700"}">${node.text}</p>`;
        }
        return "";
      })
      .join("\n");

    return `  return (
    <div className="p-4 border rounded-md bg-gray-50">
${jsxElements}
    </div>
  );`;
  }
}

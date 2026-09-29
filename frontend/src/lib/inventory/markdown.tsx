import type { ReactNode } from "react";

/**
 * Minimal, dependency-free renderer for the executive summary markdown
 * produced by src/report.py. Supports exactly what that generator emits --
 * #/##/### headers, **bold**, pipe tables, and paragraphs -- rather than
 * pulling in a full markdown library for one view.
 */
export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const renderInline = (s: string): ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, idx) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={idx} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={idx}>{p}</span>
      ),
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={key++} className="text-sm font-semibold mt-4 mb-1">
          {renderInline(line.slice(4))}
        </h4>,
      );
      i++;
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={key++} className="text-base font-semibold mt-5 mb-2 border-b border-border pb-1">
          {renderInline(line.slice(3))}
        </h3>,
      );
      i++;
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h2 key={key++} className="text-lg font-bold mt-2 mb-2">
          {renderInline(line.slice(2))}
        </h2>,
      );
      i++;
    } else if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
        .filter((cells) => !cells.every((c) => /^-+$/.test(c)));
      const [header, ...body] = rows;
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {header.map((h, idx) => (
                  <th key={idx} className="px-3 py-1.5 text-left font-medium whitespace-nowrap">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ridx) => (
                <tr key={ridx} className="border-t border-border">
                  {r.map((c, cidx) => (
                    <td key={cidx} className="px-3 py-1.5 tabular-nums whitespace-nowrap">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (line.trim() === "") {
      i++;
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 my-2 space-y-1 text-sm">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
    } else if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      blocks.push(
        <p key={key++} className="text-sm italic text-muted-foreground my-2">
          {line.slice(1, -1)}
        </p>,
      );
      i++;
    } else {
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed my-2">
          {renderInline(line)}
        </p>,
      );
      i++;
    }
  }

  return <div>{blocks}</div>;
}

import { input } from "@aicore-fivem/lib/client";

/** A text typed in the input dialog (trimmed), or null when it was closed or left empty. */
export async function typed(
  title: string,
  label: string,
  confirm: string,
): Promise<string | null> {
  const values = await input({
    title,
    confirm,
    fields: [
      { name: "text", label, type: "text", maxLength: 300, multiline: true },
    ],
  });
  const text = values?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

import { z } from 'zod/v3';

// `fileContent` NAO faz parte do schema de proposito: pedir ao LLM que devolva o
// arquivo verbatim fazia ele reescrever os dados (quebras de linha viravam <br>,
// datas perdiam digitos) ou truncar arquivos grandes, sem sinalizar erro algum.
// O bloco de dados e recortado da mensagem original em codigo, no intentNode.
export const IntentSchema = z.object({
    intent: z.string().describe('A clean, concise natural-language description of what the user wants to accomplish. Do NOT include any CSV or JSON data in this field.'),
    fileName: z.string().nullable().describe('An inferred filename for the data (e.g. "sales.csv", "report.json"). Derive it from the question.'),
    fileType: z.enum(['csv', 'json', 'unknown']).describe('The inferred file type based on the content or filename. If it looks like CSV, set to "csv". If it looks like JSON, set to "json". Otherwise, set to "unknown".'),
});

export type IntentData = z.infer<typeof IntentSchema>;

export const getSystemPrompt = () =>
    `
You are an intent extraction assistant.
Analyze the user message and extract the requested fields as structured output.
The user message may contain a natural-language instruction mixed with raw file content (CSV or JSON).
Describe only the goal in "intent" — never copy the data block into it.
Infer "fileName" and "fileType" from the instruction and from the shape of the data.
If no file data is present, set fileName to null and fileType to "unknown".
`.trim();

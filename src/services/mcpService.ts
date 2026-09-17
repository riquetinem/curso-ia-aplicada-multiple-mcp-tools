import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { getMongoDBTool } from "../tools/mongodbTool.ts";

// Cada `new MultiServerMCPClient` sobe um processo stdio do mongodb-mcp-server.
// Sem este cache, toda chamada a getMCPTools() vazaria um processo novo.
let toolsPromise: Promise<any[]> | null = null;

const loadTools = async () => {
  const client = new MultiServerMCPClient({
    mcpServers: {
      ...getMongoDBTool()
    },
    onMessage: (log, source) => {
      console.log(`[${source.server}] ${log.data}`);
    }
  });

  return client.getTools();
};

export const getMCPTools = async () => {
  toolsPromise ??= loadTools();
  return toolsPromise;
};

/**
 * Invoca uma tool MCP direto do codigo, sem passar pelo LLM.
 * Usado para operacoes que precisam ser deterministicas (gravar os dados no
 * Mongo), onde deixar o modelo reproduzir o payload arriscaria corromper linhas.
 */
export const callMCPTool = async (name: string, args: Record<string, unknown>) => {
  const tools = await getMCPTools();
  const tool = tools.find((t) => t.name === name);

  if (!tool) {
    const available = tools.map((t) => t.name).join(', ');
    throw new Error(`MCP tool "${name}" nao encontrada. Disponiveis: ${available}`);
  }

  return tool.invoke(args);
};

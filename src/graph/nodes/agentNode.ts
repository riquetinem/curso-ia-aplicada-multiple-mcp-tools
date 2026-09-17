import { AIMessage } from 'langchain';
import { OpenRouterService } from '../../services/openRouterService.ts';
import type { GraphState } from '../state.ts';
import { getSystemPrompt, getUserPrompt } from '../../prompts/v1/agentNode.ts';
import { callMCPTool } from '../../services/mcpService.ts';
import { MONGO_DATABASE } from '../../tools/mongodbTool.ts';
import { toRecords } from '../../services/dataExtractor.ts';

const CONNECTION_ID = 'preconfigured';

/**
 * Grava os registros no Mongo em codigo, nao via LLM. O modelo teria que
 * reproduzir cada linha nos argumentos da tool, e ja foi medido que ele trunca
 * arquivos grandes e altera valores sem sinalizar erro.
 */
async function persist(records: Record<string, unknown>[], collection: string) {
    const target = { connectionId: CONNECTION_ID, database: MONGO_DATABASE, collection };

    try {
        await callMCPTool('drop-collection', target);
        console.log(`🗑️  Collection "${collection}" limpa`);
    } catch {
        // primeira execucao: a collection ainda nao existe
    }

    await callMCPTool('insert-many', { ...target, documents: records });
    console.log(`💾 ${records.length} documentos gravados em ${MONGO_DATABASE}.${collection}`);
}

export function agentNode(openRouterService: OpenRouterService) {
    return async (state: GraphState): Promise<Partial<GraphState>> => {
        console.log('🤖 Agent node processing...');
        try {
            const collection = state.collection ?? 'dataset';

            const records = await toRecords({
                content: state.fileContent ?? '',
                type: state.fileType ?? 'unknown',
            });

            if (!records.length) {
                throw new Error('No records parsed from the data block');
            }

            await persist(records, collection);

            const userMessage = getUserPrompt({
                intent: state.intent!,
                database: MONGO_DATABASE,
                collection,
                documentCount: records.length,
                fields: Object.keys(records[0]),
                sample: JSON.stringify(records[0]),
            });

            const result = await openRouterService.generateStructured(
                getSystemPrompt(),
                userMessage,
            );

            const answer = result.data as string;

            return {
                answer,
                messages: [new AIMessage(answer)],
            };

        } catch (error) {
            console.error('Agent error:', error);
            return {
                error: error instanceof Error ? error.message : 'Unknown error',
                messages: [new AIMessage('Sorry, I had trouble processing the request.')],
            };
        }
    };
}

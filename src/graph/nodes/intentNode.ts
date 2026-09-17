import { AIMessage } from 'langchain';
import { OpenRouterService } from '../../services/openRouterService.ts';
import type { GraphState } from '../state.ts';
import { getSystemPrompt, type IntentData, IntentSchema } from '../../prompts/v1/identifyIntent.ts';
import { extractDataBlock } from '../../services/dataExtractor.ts';

/** "sales.csv" -> "sales"; garante um nome de collection valido para o Mongo. */
function toCollectionName(fileName: string): string {
    const base = fileName.replace(/\.[^.]+$/, '');
    const safe = base.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    return safe.toLowerCase() || 'dataset';
}

export function intentNode(openRouterService: OpenRouterService) {
    return async (state: GraphState): Promise<Partial<GraphState>> => {
        console.log('🧠 Intent node processing...');
        try {
            const rawQuestion = state.messages.at(-1)!.text as string;

            // Os dados saem da mensagem original, nao da resposta do modelo.
            const block = extractDataBlock(rawQuestion);

            const result = await openRouterService.generateStructured(
                getSystemPrompt(),
                rawQuestion,
                IntentSchema
            );

            const parsed = result.data as IntentData
            if (!parsed.intent) {
                console.log('Missing intent in parsed data:', parsed);
                throw new Error('Invalid intent data')
            }

            if (block.type === 'unknown' || !block.content) {
                throw new Error('No CSV or JSON data block found in the question');
            }

            // O tipo vem da deteccao em codigo; a do modelo fica so como fallback.
            const fileType = block.type;
            const fileName = parsed.fileName ?? `data.${fileType}`;
            const collection = toCollectionName(fileName);

            console.log('Extracted intent: ', parsed.intent);
            console.log('Extracted file type: ', fileType);
            console.log('Extracted file name: ', fileName);
            console.log('Data block: ', `${block.content.length} chars -> collection "${collection}"`);

            return {
                intent: parsed.intent,
                fileContent: block.content,
                fileName,
                fileType,
                collection,
            };

        } catch (error) {
            console.error('Intent node error:', error);
            return {
                messages: [new AIMessage('Sorry, I had trouble understanding the intent. Please rephrase your question or provide more details.')],
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };
}

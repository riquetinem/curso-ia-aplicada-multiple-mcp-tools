import csvtojson from 'csvtojson';

export type DataBlock = {
    content: string;
    type: 'csv' | 'json' | 'unknown';
};

/**
 * Recorta o bloco de dados bruto (CSV ou JSON) de dentro da mensagem do usuario,
 * em codigo. Antes isso era pedido ao LLM, que devolvia o arquivo alterado.
 */
export function extractDataBlock(raw: string): DataBlock {
    const text = raw.trim();

    const jsonStart = text.search(/[[{]/);
    if (jsonStart !== -1) {
        const candidate = text.slice(jsonStart);
        try {
            JSON.parse(candidate);
            return { content: candidate, type: 'json' };
        } catch {
            // nao era JSON, segue para a deteccao de CSV
        }
    }

    // CSV: primeira linha com virgulas cuja contagem se repete na linha seguinte
    // (cabecalho + primeiro registro). Dali ate o fim e o bloco de dados.
    const lines = text.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
        const columns = (lines[i].match(/,/g) ?? []).length;
        if (columns < 1) continue;
        if ((lines[i + 1].match(/,/g) ?? []).length !== columns) continue;

        return { content: lines.slice(i).join('\n').trim(), type: 'csv' };
    }

    return { content: '', type: 'unknown' };
}

/** Converte o bloco de dados em registros prontos para o Mongo, sem passar pelo LLM. */
export async function toRecords(block: DataBlock): Promise<Record<string, unknown>[]> {
    if (block.type === 'json') {
        const parsed = JSON.parse(block.content);
        return Array.isArray(parsed) ? parsed : [parsed];
    }

    if (block.type === 'csv') {
        // checkType converte "10.99" em number, senao o Mongo guarda tudo string
        // e qualquer $sum ou ordenacao numerica sai errada.
        return csvtojson({ checkType: true }).fromString(block.content);
    }

    return [];
}

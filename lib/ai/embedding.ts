import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';
const embeddingModel = openai.embedding('text-embedding-ada-002');

const generateChunks = (input: string): string[] => {
    return input
        .trim()
        .split('.')
        .filter((i) => i !== '');
};

export const generateEmbeddings = async (
    value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
    const chunks = generateChunks(value);
    const { embeddings } = await embedMany({
        model: embeddingModel,
        values: chunks,
    });
    return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
        model: embeddingModel,
        value: input,
    });
    return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
    console.log('before user q');
    const userQueryEmbedded = await generateEmbedding(userQuery);
    console.log('after user q');
    console.log('before similarity search');
    const similarity = sql<number>`1 - (${cosineDistance(
        embeddings.embedding,
        userQueryEmbedded
    )})`;
    console.log('after similarity search');
    console.log('before db select');
    const similarGuides = await db
        .select({ name: embeddings.content, similarity })
        .from(embeddings)
        .where(gt(similarity, 0.5))
        .orderBy((t) => desc(t.similarity))
        .limit(4);
    console.log('after db select');
    return similarGuides;
};

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';
import { google } from '@ai-sdk/google';
const { GoogleGenerativeAI } = require('@google/generative-ai');

const model = google.textEmbeddingModel('text-embedding-004');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
    model: 'text-embedding-004',
});

const generateChunks = (input: string): string[] => {
    return input
        .trim()
        .split('.')
        .filter((i) => i !== '');
};

function textToRequest(text: string) {
    return { content: { role: 'user', parts: [{ text }] } };
}

export const generateEmbeddings = async (
    value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
    const chunks = generateChunks(value);

    // console.log('after chunks creation');
    const result = await embeddingModel.batchEmbedContents({
        requests: [...chunks.map((chunk) => textToRequest(chunk))],
    });
    // const { embeddings } = await embedMany({
    //     model: model,
    //     values: chunks,
    // });
    // console.log(result);
    // console.log('after embeddings creation');
    return result.embeddings.map((e: { values: number[] }, i: number) => ({
        content: chunks[i],
        embedding: e.values,
    }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const result = await embeddingModel.embedContent(input);

    return result.embedding.values;
};

export const findRelevantContent = async (userQuery: string) => {
    // console.log('before user q');
    const userQueryEmbedded = await generateEmbedding(userQuery);
    // console.log('after user q');
    // console.log(
    //     'before similarity search',
    //     embeddings.embedding,
    //     userQueryEmbedded
    // );
    const similarity = sql<number>`1 - (${cosineDistance(
        embeddings.embedding,
        userQueryEmbedded
    )})`;
    console.log('after similarity search', similarity);
    // console.log('before db select');
    const similarGuides = await db
        .select({ name: embeddings.content, similarity })
        .from(embeddings)
        .where(gt(similarity, 0))
        .orderBy((t) => desc(t.similarity))
        .limit(4);
    // console.log('after db select');
    return similarGuides;
};

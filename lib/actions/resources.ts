'use server';

import {
    NewResourceParams,
    insertResourceSchema,
    resources,
} from '@/lib/db/schema/resources';
import { db } from '@/lib/db';
import { generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '@/lib/db/schema/embeddings';

export const createResource = async (input: NewResourceParams) => {
    try {
        const { content } = insertResourceSchema.parse(input);
        console.log('after input parse');
        const [resource] = await db
            .insert(resources)
            .values({ content })
            .returning();
        console.log({ resource, content });
        console.log('after db resource insert');
        const embeddings = await generateEmbeddings(content);
        console.log('after embedding generation', embeddings);
        const res = await db
            .insert(embeddingsTable)
            .values({
                resourceId: resource.id,
                content: embeddings[0].content,
                embedding: embeddings[0].embedding,
            })
            .returning();

        console.log('after embedding db insert', res);
        return 'Resource successfully created and embedded.';
    } catch (error) {
        return error instanceof Error && error.message.length > 0
            ? error.message
            : 'Error, please try again.';
    }
};

import { createResource } from '@/lib/actions/resources';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { findRelevantContent } from '@/lib/ai/embedding';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    // const { GoogleGenerativeAI } = require('@google/generative-ai');
    const google = createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
    });
    const model = google('gemini-1.5-pro-latest');
    // const { text } = await generateText({
    //     model,
    //     prompt: 'Write a vegetarian lasagna recipe for 4 people.',
    // });

    const result = streamText({
        model,
        messages,
        system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sajnos nem találtam információt"`,
        tools: {
            addResource: tool({
                description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
                parameters: z.object({
                    content: z
                        .string()
                        .describe(
                            'the content or resource to add to the knowledge base'
                        ),
                }),
                execute: async ({ content }) => createResource({ content }),
            }),
            getInformation: tool({
                description: `get information from your knowledge base to answer questions.`,
                parameters: z.object({
                    question: z.string().describe('the users question'),
                }),
                execute: async ({ question }) => findRelevantContent(question),
            }),
        },
    });

    return result.toDataStreamResponse();

    // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    // console.log(messages);
    // const result = await model.generateContent(
    //     messages[messages.length - 1].content
    // );
    // messages.push({ role: 'assistant', content: result, parts: [] });

    // const r = streamText({
    //     model,
    //     messages,
    // });

    // console.log(r);

    // return NextResponse.json({ result: result.response.text() });
}

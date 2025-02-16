import { createResource } from '@/lib/actions/resources';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { findRelevantContent } from '@/lib/ai/embedding';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});
const model = google('gemini-2.0-flash', {});

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = await streamText({
        model,
        messages,
        system: `Egy segítőkész aszisztens vagy. 
        Mielőtt egy kérdésre válaszolnál, használd az eszközeid (tools) hogy információt kapj a feltett kérdésre!
        Csak olyan kérdésre válaszolj, amelyről van információd a tudásbázisodban (getInformation). Ha nincs releváns információ, válaszolj úgy: Nem találtam megfelelő információt!`,
        tools: {
            addResource: tool({
                description: `add a resource to your knowledge base. If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
                parameters: z.object({
                    content: z
                        .string()
                        .describe(
                            'the content or resource to add to the knowledge base'
                        ),
                }),
                execute: async ({ content }) =>
                    await createResource({ content }),
            }),
            getInformation: tool({
                description: `Tool to get information from your knowledge base to answer questions.`,
                parameters: z.object({
                    question: z.string().describe('the users question'),
                }),
                execute: async ({ question }) =>
                    await findRelevantContent(question),
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

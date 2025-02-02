import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to split text into chunks of roughly equal size
function splitTextIntoChunks(text: string, maxChunkSize: number = 10000): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  const sentences = text.split(/[.!?]+/); // Split by sentence endings

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += sentence + ". ";
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Function to merge analysis results
function mergeAnalysisResults(results: any[]): any {
  const merged = {
    keyTerms: new Set<string>(),
    risks: new Set<string>(),
    obligations: new Set<string>()
  };

  results.forEach(result => {
    result.keyTerms?.forEach((term: string) => merged.keyTerms.add(term));
    result.risks?.forEach((risk: string) => merged.risks.add(risk));
    result.obligations?.forEach((obligation: string) => merged.obligations.add(obligation));
  });

  return {
    keyTerms: Array.from(merged.keyTerms),
    risks: Array.from(merged.risks),
    obligations: Array.from(merged.obligations)
  };
}

// Function to safely parse JSON
function safeJSONParse(text: string) {
  try {
    // Remove any markdown code block syntax if present
    const cleanText = text.replace(/```json\n|\n```/g, '');
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('JSON parsing error:', error);
    console.log('Problematic text:', text);
    return { keyTerms: [], risks: [], obligations: [] };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { documentText } = await req.json()
    console.log('Received document text for analysis')

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    console.log('OpenAI client initialized')

    // Split text into manageable chunks
    const chunks = splitTextIntoChunks(documentText);
    console.log(`Split document into ${chunks.length} chunks`);

    // Analyze each chunk
    const analysisPromises = chunks.map(async (chunk, index) => {
      console.log(`Analyzing chunk ${index + 1}/${chunks.length}`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a legal document analyzer. Analyze the given text and respond with a JSON object containing three arrays: keyTerms, risks, and obligations. Do not include any markdown formatting in your response."
          },
          {
            role: "user",
            content: `Analyze this portion of a legal document and provide:
            1. Key Terms: Important defined terms and their meanings
            2. Risks: Potential risks or liabilities
            3. Obligations: Key responsibilities and commitments
            
            Document portion:
            ${chunk}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      return safeJSONParse(completion.choices[0].message.content || '{}');
    });

    // Wait for all chunks to be analyzed
    const chunkResults = await Promise.all(analysisPromises);
    console.log('All chunks analyzed successfully');

    // Merge results from all chunks
    const mergedAnalysis = mergeAnalysisResults(chunkResults);
    console.log('Analysis results merged successfully');

    return new Response(
      JSON.stringify(mergedAnalysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in analyze-document function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
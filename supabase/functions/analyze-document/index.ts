import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const MAX_CHUNK_LENGTH = 4000; // Reduced chunk size to avoid token limits
const MAX_RETRIES = 3;
const BASE_DELAY = 3000; // 3 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to split text into chunks
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = text.split(/[.!?]+\s/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > MAX_CHUNK_LENGTH) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to analyze a chunk of text with retry logic
async function analyzeChunk(chunk: string, retryCount = 0): Promise<any> {
  try {
    console.log(`Analyzing chunk (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analyzer. Analyze the provided text and extract key terms, risks, and obligations. Return the results in a JSON format with three arrays: keyTerms, risks, and obligations.'
          },
          {
            role: 'user',
            content: chunk
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      
      // Check if it's a rate limit error
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const delay_time = BASE_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limit hit. Retrying in ${delay_time/1000} seconds...`);
        await delay(delay_time);
        return analyzeChunk(chunk, retryCount + 1);
      }
      
      throw new Error(error);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay_time = BASE_DELAY * Math.pow(2, retryCount);
      console.log(`Error occurred. Retrying in ${delay_time/1000} seconds...`);
      await delay(delay_time);
      return analyzeChunk(chunk, retryCount + 1);
    }
    throw error;
  }
}

// Helper function to merge analysis results
function mergeResults(results: any[]): any {
  const merged = {
    keyTerms: new Set<string>(),
    risks: new Set<string>(),
    obligations: new Set<string>()
  };

  results.forEach(result => {
    if (result.keyTerms) result.keyTerms.forEach((term: string) => merged.keyTerms.add(term));
    if (result.risks) result.risks.forEach((risk: string) => merged.risks.add(risk));
    if (result.obligations) result.obligations.forEach((obl: string) => merged.obligations.add(obl));
  });

  return {
    keyTerms: Array.from(merged.keyTerms),
    risks: Array.from(merged.risks),
    obligations: Array.from(merged.obligations)
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText } = await req.json();
    console.log('Received document text for analysis');

    if (!documentText) {
      throw new Error('No document text provided');
    }

    // Split document into chunks
    const chunks = splitIntoChunks(documentText);
    console.log(`Document split into ${chunks.length} chunks`);

    // Analyze each chunk with retries
    const chunkResults = [];
    for (const chunk of chunks) {
      const result = await analyzeChunk(chunk);
      chunkResults.push(result);
    }

    // Merge results from all chunks
    const finalResults = mergeResults(chunkResults);
    console.log('Analysis completed successfully');

    return new Response(JSON.stringify(finalResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-document function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
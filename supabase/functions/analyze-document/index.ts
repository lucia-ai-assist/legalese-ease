import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Sending request to OpenAI')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Changed from gpt-4o to gpt-4o-mini
      messages: [
        {
          role: "system",
          content: "You are a legal document analyzer. Analyze documents and return results in JSON format with keyTerms, risks, and obligations arrays."
        },
        {
          role: "user",
          content: `Analyze this legal document and provide:
          1. Key Terms: Important defined terms and their meanings
          2. Risks: Potential risks or liabilities
          3. Obligations: Key responsibilities and commitments
          
          Document:
          ${documentText}
          
          Format the response as a JSON object with three arrays: keyTerms, risks, and obligations.`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    })
    console.log('Received response from OpenAI')

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')
    console.log('Successfully parsed analysis result')

    return new Response(
      JSON.stringify(analysis),
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
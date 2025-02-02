import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0'

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

    // Create OpenAI configuration
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)

    const prompt = `Analyze the following legal document and provide:
    1. Key Terms: Important defined terms and their meanings
    2. Risks: Potential risks or liabilities
    3. Obligations: Key responsibilities and commitments
    
    Document:
    ${documentText}
    
    Please format the response as a JSON object with three arrays: keyTerms, risks, and obligations.`

    const response = await openai.createCompletion({
      model: "gpt-4o",
      prompt: prompt,
      max_tokens: 1000,
      temperature: 0.5,
    })

    const analysis = JSON.parse(response.data.choices[0].text || '{}')

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
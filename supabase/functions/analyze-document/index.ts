import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
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
    console.log('Received document text for analysis')

    // Create OpenAI configuration
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)
    console.log('OpenAI client initialized')

    const messages = [
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
    ]

    console.log('Sending request to OpenAI')
    const completion = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.5,
      max_tokens: 1000
    })
    console.log('Received response from OpenAI')

    const analysis = JSON.parse(completion.data.choices[0].message.content || '{}')
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
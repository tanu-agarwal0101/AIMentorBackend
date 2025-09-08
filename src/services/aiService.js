import {CohereClient} from "cohere-ai"
import OpenAI from "openai"

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
})

const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY
})

export async function getAIResponse(message) {
    try {
         const response = await cohere.chat({
           model: "command-r-plus-08-2024",
           message: message,
             
           
           max_tokens: 150,
         });
        
        

         const output =
      response.text ||
      "Sorry, I could not generate a response";

    return output 
    } catch (error) {
        console.error("Cohere API error: ", error)
        return "AI Service is unable to respond at the moment"
    }
}


export async function getAIResponseOpenAI(message) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{role: "user", content: message}]
        })

        return response.choices[0].message?.content || "Sorry, no response"
    } catch (error) {
        console.error("OpenAI API error: ", error)
        return "AI service is unavailable at the moment.";
    }
}
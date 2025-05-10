import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/neon";
import { interview } from "@/neon/schema";
import { getRandomInterviewCover } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import { chatSession } from "@/gemini-model/GeminiAIModel";

export async function POST(request) {
  const { type, role, level, techstack, amount, userId } = await request.json();
  console.log("Generating interview:", { type, role, level, techstack, amount, userId });

  try {
    // Instead of using AI SDK, we'll use the existing chatSession which already has the API key configured
    const prompt = `Prepare questions for a job interview.
      The job role is ${role}.
      The job experience level is ${level}.
      The tech stack used in the job is: ${techstack}.
      The focus between behavioural and technical questions should lean towards: ${type}.
      The amount of questions required is: ${amount}.
      Please return only the questions, without any additional text.
      The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
      Return the questions formatted like this:
      ["Question 1", "Question 2", "Question 3"]
      
      Thank you!
    `;
    
    console.log("Sending request to Gemini API...");
    const geminiResult = await chatSession.sendMessage(prompt);
    const questions = geminiResult.response.text();

    console.log("Generated questions:", questions);

    let parsedQuestions;
    try {
      // Try to parse as JSON
      const cleanedJson = questions.replace(/```json|```/g, '').trim();
      parsedQuestions = JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Error parsing questions:", error);
      // If parsing fails, try to extract from string
      const match = questions.match(/\[(.*)\]/s);
      if (match) {
        const content = match[1].replace(/"/g, '"').replace(/'/g, '"');
        parsedQuestions = JSON.parse(`[${content}]`);
      } else {
        // Create a simple array from the response
        parsedQuestions = questions.split('\n').filter(q => q.trim().length > 0);
      }
    }

    // Convert to question/answer format
    const formattedQuestions = parsedQuestions.map(q => ({
      question: q,
      answer: ""
    }));
    
    const questionsJson = JSON.stringify(formattedQuestions);
    
    // Generate a unique ID
    const interviewId = uuidv4();
    
    // Insert in the database
    const dbResult = await db
      .insert(interview)
      .values({
        interviewId: interviewId,
        jsonresponse: "",
        jsonquestionsrespnse: questionsJson,
        createdBy: userId,
        createdAt: moment().format("DD-MM-YYYY"),
        type: type,
        role: role,
        level: level,
        techstack: techstack,
        coverImage: getRandomInterviewCover()
      })
      .returning({ interviewId: interview.interviewId });

    return Response.json({ 
      success: true, 
      interviewId: dbResult[0].interviewId 
    }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    success: true, 
    message: "Use POST to generate an interview" 
  }, { status: 200 });
} 
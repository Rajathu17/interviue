import { chatSession } from "@/gemini-model/GeminiAIModel";
import { db } from "@/neon";
import { interview } from "@/neon/schema";
import { getRandomInterviewCover } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";

export async function POST(request) {
  try {
    const { resumeText, userId, questionCount = 5 } = await request.json();
    
    if (!resumeText || resumeText.length < 10) {
      return Response.json({ 
        success: false, 
        error: "Resume text is too short or empty" 
      }, { status: 400 });
    }
    
    // Generate questions using Gemini model
    const inputPrompt = 
      resumeText + `Based on the given resume, generate ${questionCount} interview questions 
      that are specific to the candidate's experience, skills, and background.
      The questions should be challenging but fair, and should help assess the candidate's
      suitability for roles matching their experience.
      
      Return your response as a JSON array of objects with 'question' and 'answer' fields.
      The 'answer' field should provide guidance on what would constitute a good answer.
      
      Format: [{"question": "Question text here?", "answer": "Expected answer guidance here"}]`;
    
    console.log("Sending request to Gemini API...");
    const result = await chatSession.sendMessage(inputPrompt);
    const rawResponse = result.response.text();
    
    // Process and format the response
    let jsonQuestionsResponse = rawResponse.replace(/```json|```/g, '').trim();
    
    // Attempt to parse and validate the JSON
    let formattedQuestions;
    try {
      // Parse the response
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonQuestionsResponse);
      } catch (initialParseError) {
        // Try to fix common JSON issues
        jsonQuestionsResponse = jsonQuestionsResponse
          .replace(/(\w+):/g, '"$1":')  // Add quotes to keys
          .replace(/'/g, '"')           // Replace single quotes with double quotes
          .replace(/,\s*}/g, '}')       // Remove trailing commas
          .replace(/,\s*\]/g, ']');     // Remove trailing commas in arrays
        
        parsedJson = JSON.parse(jsonQuestionsResponse);
      }
      
      // Format based on structure
      if (Array.isArray(parsedJson)) {
        formattedQuestions = parsedJson.map((item, index) => {
          if (typeof item === 'string') {
            return { question: item, answer: "" };
          } else if (typeof item === 'object') {
            if (item.question) return item;
            
            // Convert object to question/answer format
            const key = Object.keys(item)[0];
            return { 
              question: key, 
              answer: item[key] 
            };
          }
          return { question: `Question ${index + 1}`, answer: "N/A" };
        });
      } else if (typeof parsedJson === 'object') {
        // Handle object formats
        if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
          formattedQuestions = parsedJson.questions;
        } else {
          formattedQuestions = Object.entries(parsedJson).map(([key, value]) => {
            if (typeof value === 'object' && value.question) {
              return value;
            }
            return { 
              question: key, 
              answer: value 
            };
          });
        }
      } else {
        throw new Error("Invalid JSON structure from AI");
      }
    } catch (error) {
      console.error("Error processing questions:", error);
      // Fallback to simple format if JSON processing fails
      formattedQuestions = [
        { 
          question: "Tell me about your background and experience?", 
          answer: "The candidate should discuss their relevant experience as mentioned in their resume." 
        },
        { 
          question: "What are your key skills and strengths?", 
          answer: "Look for alignment with skills mentioned in the resume."
        }
      ];
    }
    
    // Save to database
    const questionsJson = JSON.stringify(formattedQuestions);
    const interviewId = uuidv4();
    
    const result2 = await db
      .insert(interview)
      .values({
        interviewId: interviewId,
        jsonresponse: resumeText,
        jsonquestionsrespnse: questionsJson,
        createdBy: userId,
        createdAt: moment().format("DD-MM-YYYY"),
        type: "resume",
        role: "Resume-Based",
        level: "Custom",
        techstack: "",
        coverImage: getRandomInterviewCover()
      })
      .returning({ interviewId: interview.interviewId });
    
    return Response.json({ 
      success: true, 
      interviewId: result2[0].interviewId 
    }, { status: 200 });
  } catch (error) {
    console.error("Error generating resume interview:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 
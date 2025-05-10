// Simple script to generate interview questions without needing the full app
require('dotenv').config({ path: '../.env.local' }); // Load environment variables

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Get the API key
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERROR: NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set.");
  console.error("Create a .env.local file in the root directory with:");
  console.error("NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here");
  process.exit(1);
}

// Initialize the Gemini model
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

// Interview configuration
const config = {
  role: "Frontend Developer",
  level: "mid",
  techstack: "React, TypeScript, CSS",
  type: "technical",
  questionCount: 5
};

async function generateQuestions() {
  try {
    console.log("Generating interview questions...");
    console.log(`Role: ${config.role}`);
    console.log(`Level: ${config.level}`);
    console.log(`Tech Stack: ${config.techstack}`);
    console.log(`Type: ${config.type}`);
    console.log(`Number of questions: ${config.questionCount}`);
    console.log("\nSending request to Gemini API...");

    const prompt = `Prepare ${config.questionCount} questions for a job interview.
      The job role is ${config.role}.
      The job experience level is ${config.level}.
      The tech stack used in the job is: ${config.techstack}.
      The focus between behavioural and technical questions should lean towards: ${config.type}.
      
      Please return only the questions, without any additional text.
      Return the questions formatted like this:
      ["Question 1", "Question 2", "Question 3"]
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log("\nRaw response from Gemini:");
    console.log(response);

    // Process the response
    let questions;
    try {
      // Try to extract JSON array
      const match = response.match(/\[([\s\S]*)\]/);
      if (match) {
        const jsonStr = match[0].replace(/'/g, '"');
        questions = JSON.parse(jsonStr);
      } else {
        // Fallback to splitting by lines
        questions = response.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && line.match(/^\d+\.|^-|^\*/) !== null)
          .map(line => line.replace(/^\d+\.|-|\*/, '').trim());
      }

      // Format questions with answers
      const formattedQuestions = questions.map((q, i) => ({
        question: q,
        answer: `Sample answer for question ${i + 1}.`
      }));

      // Save to file
      const outputFile = path.join(__dirname, 'generated-questions.json');
      fs.writeFileSync(outputFile, JSON.stringify(formattedQuestions, null, 2));

      console.log("\n----------------------------------------------");
      console.log(`Generated ${formattedQuestions.length} Questions:`);
      console.log("----------------------------------------------");
      formattedQuestions.forEach((q, i) => {
        console.log(`${i + 1}. ${q.question}`);
      });
      console.log("----------------------------------------------");
      console.log(`Questions saved to: ${outputFile}`);

    } catch (error) {
      console.error("Error processing questions:", error);
      console.log("Raw text from response:");
      console.log(response);
    }
  } catch (error) {
    console.error("Error generating questions:", error.message);
  }
}

generateQuestions(); 
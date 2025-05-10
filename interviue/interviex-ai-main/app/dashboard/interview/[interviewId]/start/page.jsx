"use client"
import { db } from '@/neon';
import { interview } from '@/neon/schema';
import { eq } from 'drizzle-orm';
import React, { useEffect, useState } from 'react'
import Questions from './_components/Questions'
import Answer from './_components/Answer'

const Page = ({ params }) => {
  const [interviewDetails, setInterviewDetails] = useState()
  const [questions, setQuestions] = useState([])
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchInterviewContent = async () => {
      try {
        const response = await db
          .select()
          .from(interview)
          .where(eq(interview.interviewId, params.interviewId));
        
        if (!response || response.length === 0) {
          throw new Error("Interview not found");
        }
        
        console.log("Raw data:", response[0].jsonquestionsrespnse);
        
        let parsedQuestions;
        try {
          const jsonData = response[0].jsonquestionsrespnse.trim();
          parsedQuestions = JSON.parse(jsonData);
          
          // Handle different possible response formats
          if (Array.isArray(parsedQuestions)) {
            // Check if the array contains valid question objects
            if (parsedQuestions.length > 0) {
              // Ensure each item has a question property
              const formattedQuestions = parsedQuestions.map((item, index) => {
                if (typeof item === 'string') {
                  return { question: item, answer: "" };
                } else if (typeof item === 'object') {
                  // If it has a question property, use it as is
                  if (item.question) {
                    return item;
                  }
                  // Otherwise, use the first key as question and its value as answer
                  const key = Object.keys(item)[0];
                  return { question: key, answer: item[key] };
                }
                return { question: `Question ${index + 1}`, answer: JSON.stringify(item) };
              });
              setQuestions(formattedQuestions);
            } else {
              throw new Error("Empty questions array");
            }
          } else if (typeof parsedQuestions === 'object') {
            // If it's an object with questions property
            if (parsedQuestions.questions && Array.isArray(parsedQuestions.questions)) {
              setQuestions(parsedQuestions.questions);
            } 
            // If it has numbered keys like "1", "2", etc.
            else if (Object.keys(parsedQuestions).some(key => !isNaN(Number(key)))) {
              const questionsArray = Object.entries(parsedQuestions).map(([key, value]) => {
                if (typeof value === 'string') {
                  return { question: value, answer: "" };
                } else if (typeof value === 'object' && value.question) {
                  return value;
                } else {
                  return { question: `Question ${key}`, answer: JSON.stringify(value) };
                }
              });
              setQuestions(questionsArray);
            }
            // If it has question/answer keys
            else if (Object.keys(parsedQuestions).includes("question") || 
                    Object.keys(parsedQuestions).includes("questions") ||
                    Object.keys(parsedQuestions).some(key => key.includes("question"))) {
              setQuestions([parsedQuestions]);
            }
            else {
              // Convert object keys to questions and values to answers
              const questionsArray = Object.entries(parsedQuestions).map(([key, value]) => {
                return { question: key, answer: typeof value === 'object' ? JSON.stringify(value) : value };
              });
              setQuestions(questionsArray);
            }
          } else {
            throw new Error("Invalid response format");
          }
          
          console.log("Parsed questions:", JSON.stringify(questions));
        } catch (parseError) {
          console.error("JSON parsing error:", parseError);
          setError("Could not parse interview questions. Please try again.");
          // Set empty array as fallback
          setQuestions([]);
        }
        
        setInterviewDetails(response[0]);
      } catch (error) {
        console.error("Error fetching interview:", error);
        setError("Error loading interview: " + error.message);
      }
    };
    
    fetchInterviewContent();
  }, [params.interviewId]);

  if (error) {
    return (
      <div className="text-red-500 p-8 text-center">
        <h2 className="text-xl font-bold">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
		<div>
			<div className='grid grid-cols-1 md:grid-cols-2'>
				{/* Questions */}
				<Questions
					questions={questions}
					activeQuestionIndex={activeQuestionIndex}
					setActiveQuestionIndex={setActiveQuestionIndex}
				/>
				{/* video / audio recording  */}
				<Answer
					questions={questions}
					activeQuestionIndex={activeQuestionIndex}
					interviewDetails={interviewDetails}
				/>
			</div>
		</div>
	);
}

export default Page
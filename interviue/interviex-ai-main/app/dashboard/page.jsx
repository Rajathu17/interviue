"use client";
import React, { use, useState } from "react";
import axios from "axios";
import styles from "./Dashboard.module.css";
import Loader from './_components/Loader'
import { chatSession } from "../../gemini-model/GeminiAIModel";
import { db } from "@/neon";
import {v4 as uuidv4} from "uuid"
import { useUser } from "@clerk/nextjs";
import moment from "moment"
import { interview } from "@/neon/schema";
import { useRouter } from "next/navigation";
import { getRandomInterviewCover } from "@/lib/utils";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const Page = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [convertedText, setConvertedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const {user} = useUser();
  const router = useRouter();
  
  // New interview form state
  const [interviewType, setInterviewType] = useState("balanced"); // technical, behavioral, balanced
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid"); // junior, mid, senior
  const [techStack, setTechStack] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile.name); 
  };

  const handleGenerateFromResume = async () => {
    setErrorMessage("");
    if(file) setLoading(true);
    if (!file) {
      alert("Please select a file first!");
      return;
    }
    
    // Check if file is PDF
    if (!file.type.includes('pdf')) {
      setLoading(false);
      setErrorMessage("Please upload a PDF file.");
      alert("Please upload a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("File", file);

    try {
      const convertApiSecret = process.env.NEXT_PUBLIC_CONVERTAPI_SECRET;
      console.log("Using ConvertAPI with secret key length:", convertApiSecret ? convertApiSecret.length : 0);
      
      const response = await axios.post(
				`https://v2.convertapi.com/convert/pdf/to/txt?Secret=${convertApiSecret}`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);
      
      if (!response.data || !response.data.Files || !response.data.Files[0] || !response.data.Files[0].FileData) {
        throw new Error("Invalid response from ConvertAPI: " + JSON.stringify(response.data));
      }
      
      const fileData = response.data.Files[0].FileData;
      const decodedText = atob(fileData);
      
      if (!decodedText || decodedText.length < 10) {
        throw new Error("Converted text is too short or empty");
      }
      
      console.log("Resume text extracted successfully, length:", decodedText.length);
      
      // Send the resume text to the API endpoint
      const apiResponse = await fetch('/api/generate/resume-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: decodedText,
          userId: user.primaryEmailAddress.emailAddress,
          questionCount: 5
        }),
      });
      
      const data = await apiResponse.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to generate interview questions from resume");
      }
      
      console.log("Resume interview created:", data);
      router.push(`/dashboard/interview/${data.interviewId}`);

    } catch (error) {
      console.error("Error processing resume:", error);
      const errorDetails = error.response ? 
        `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}` : 
        error.message;
      
      setErrorMessage(`Error: ${errorDetails}`);
      alert(`Error processing your resume: ${errorDetails}. Please try again or contact support.`);
    }
    setLoading(false);
  };

  const handleCustomInterview = async () => {
    if (!jobRole) {
      alert("Please enter a job role");
      return;
    }

    if (!techStack) {
      alert("Please enter technologies used in the job");
      return;
    }

    setLoading(true);
    
    try {
      // Instead of using the SDK directly, call our API route which handles the key correctly
      const response = await fetch('/api/generate/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: interviewType,
          role: jobRole,
          level: experienceLevel,
          techstack: techStack,
          amount: questionCount,
          userId: user.primaryEmailAddress.emailAddress
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to generate interview");
      }
      
      console.log("Interview created:", data);
      router.push(`/dashboard/interview/${data.interviewId}`);
    } catch (error) {
      console.error("Error generating interview:", error);
      setErrorMessage(`Error: ${error.message}`);
      alert(`Error generating interview: ${error.message}. Please try again.`);
    }
    
    setLoading(false);
  };

  return (
    <div className={styles.background}>
      {!loading && (
        <div className="flex flex-col items-center mt-10">
          <h1 className="text-3xl font-bold text-white mb-8">Create New Interview</h1>
          
          <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8">
            {/* Resume-based Interview */}
            <div className="flex-1 bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">Resume-Based Interview</h2>
              <p className="text-gray-300 mb-6">Upload your resume and we'll generate personalized interview questions based on your experience.</p>
              
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-950 hover:bg-gray-900"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload your Resume</span> 
                    </p>
                    {!fileName && (
                      <p className="text-xs text-gray-500">
                        Upload your resume (PDF format, MAX. 30mb)
                      </p>
                    )}
                    {fileName && (
                      <p className="text-xs text-gray-500">
                        {fileName}
                      </p>
                    )}
                  </div>
                  <input
                    id="dropzone-file"
                    type="file"
                    className="hidden relative"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <button
                onClick={handleGenerateFromResume}
                type="button"
                className="w-full py-2.5 px-5 mt-6 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none"
              >
                Generate Resume Interview
              </button>
            </div>
            
            {/* Custom Interview */}
            <div className="flex-1 bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">Custom Interview</h2>
              <p className="text-gray-300 mb-6">Create a tailored interview by specifying the job role, experience level, and technologies.</p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="jobRole" className="block text-sm font-medium text-gray-300 mb-1">
                    Job Role
                  </label>
                  <input
                    type="text"
                    id="jobRole"
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Frontend Developer"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-300 mb-1">
                    Experience Level
                  </label>
                  <select
                    id="experienceLevel"
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                  >
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="techStack" className="block text-sm font-medium text-gray-300 mb-1">
                    Technologies
                  </label>
                  <input
                    type="text"
                    id="techStack"
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., React, Node.js, MongoDB"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="interviewType" className="block text-sm font-medium text-gray-300 mb-1">
                    Interview Focus
                  </label>
                  <select
                    id="interviewType"
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                  >
                    <option value="balanced">Balanced</option>
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="questionCount" className="block text-sm font-medium text-gray-300 mb-1">
                    Number of Questions: {questionCount}
                  </label>
                  <input
                    type="range"
                    id="questionCount"
                    min="3"
                    max="10"
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <button
                onClick={handleCustomInterview}
                type="button"
                className="w-full py-2.5 px-5 mt-6 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none"
              >
                Create Custom Interview
              </button>
            </div>
          </div>
          
          {errorMessage && (
            <div className="text-red-500 my-4 text-sm max-w-4xl">
              {errorMessage}
            </div>
          )}
        </div>
      )}
      
      {loading && (
        <div className="mt-64">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default Page;

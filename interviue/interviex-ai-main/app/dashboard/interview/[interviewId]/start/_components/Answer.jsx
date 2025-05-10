"use client";
import React, { useEffect, useState } from "react";
import Webcam from "react-webcam";
import useSpeechToText from "react-hook-speech-to-text";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { chatSession } from "@/gemini-model/GeminiAIModel";
import { useUser } from "@clerk/nextjs";
import moment from "moment"; 
import { db } from "@/neon";
import { userAnswer } from "@/neon/schema";
import { v4 as uuidv4 } from "uuid";

const Answer = ({ questions, activeQuestionIndex, interviewDetails }) => {
	const [userAnswerText, setUserAnswerText] = useState("");
	const [cameraAllowed, setCameraAllowed] = useState(true);
	const [microphoneAllowed, setMicrophoneAllowed] = useState(true);
	const { user } = useUser();
	const [loading, setLoading] = useState(false);
	const [debugInfo, setDebugInfo] = useState(null);
	const [manualSubmitEnabled, setManualSubmitEnabled] = useState(false);

	// Validate questions and active question
	const isValidQuestions = Array.isArray(questions) && questions.length > 0;
	
	// Function to get question text safely from different formats
	const getQuestionText = (questionObj, index) => {
		if (!questionObj) return `Question ${index + 1}`;
		
		if (typeof questionObj === 'string') {
			return questionObj;
		}
		
		if (typeof questionObj === 'object') {
			// Check for common properties that might contain the question
			if (questionObj.question) {
				return questionObj.question;
			}
			
			// Check for a property that looks like a question (ends with ?)
			const possibleQuestionKey = Object.keys(questionObj).find(key => 
				typeof questionObj[key] === 'string' && 
				(questionObj[key].trim().endsWith('?') || key.toLowerCase().includes('question'))
			);
			
			if (possibleQuestionKey) {
				return questionObj[possibleQuestionKey];
			}
			
			// If all else fails, stringify the object
			return `Question ${index + 1}: ${JSON.stringify(questionObj)}`;
		}
		
		return `Question ${index + 1}`;
	};
	
	// Function to get answer text safely from different formats
	const getAnswerText = (questionObj, index) => {
		if (!questionObj) return "";
		
		if (typeof questionObj === 'object') {
			// Check for common properties that might contain the answer
			if (questionObj.answer) {
				return questionObj.answer;
			}
			
			// Try to find an answer-like field
			const answerKey = Object.keys(questionObj).find(key => 
				typeof questionObj[key] === 'string' && 
				(key.toLowerCase().includes('answer') || key.toLowerCase().includes('response'))
			);
			
			if (answerKey) {
				return questionObj[answerKey];
			}
		}
		
		return "No sample answer available.";
	};
	
	const hasActiveQuestion = isValidQuestions && 
		activeQuestionIndex >= 0 && 
		activeQuestionIndex < questions.length;

	const {
		error,
		interimResult,
		isRecording,
		results,
		startSpeechToText,
		stopSpeechToText,
	} = useSpeechToText({
		continuous: true,
		useLegacyResults: false,
        crossBrowser: true,
        googleApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        speechRecognitionProperties: { interimResults: true },
        formatResult: (result) => result
	});

	useEffect(() => {
		results.forEach((result) => {
			setUserAnswerText((prevAnswer) => prevAnswer + " " + result.transcript);
		});
	}, [results]);

	// Enable manual submit when recording is stopped and we have enough text
	useEffect(() => {
		if (!isRecording && userAnswerText.length >= 10) {
			setManualSubmitEnabled(true);
		}
	}, [isRecording, userAnswerText]);

	const handleRecordingToggle = async () => {
		if (!hasActiveQuestion) {
			toast.error("Please select a valid question first", {
				position: "top-center",
				autoClose: 3000,
				hideProgressBar: true,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				theme: "dark",
			});
			return;
		}

		if (isRecording) {
			stopSpeechToText();
			setManualSubmitEnabled(true);
			toast.info("Recording stopped. Submit your answer when ready.", {
				position: "top-center",
				autoClose: 3000,
				hideProgressBar: true,
			});
		} else {
			setUserAnswerText(""); // Clear previous answer
			setManualSubmitEnabled(false);
			startSpeechToText();
			toast.info("Recording started. Speak your answer clearly.", {
				position: "top-center",
				autoClose: 3000,
				hideProgressBar: true,
			});
		}
	};

	const submitAnswer = async () => {
		if (!hasActiveQuestion) {
			toast.error("No valid question selected", {
				position: "top-center",
				autoClose: 3000,
				hideProgressBar: true,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				theme: "dark",
			});
			return;
		}

		if (userAnswerText.length < 10) {
			toast.error("Answer is too short! Please provide more details.", {
				position: "top-center",
				autoClose: 3000,
				hideProgressBar: true,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				theme: "dark",
			});
			return;
		}

		setLoading(true);
		setDebugInfo(null);
		
		try {
			// Get question and expected answer
			const questionText = getQuestionText(questions[activeQuestionIndex], activeQuestionIndex);
			const expectedAnswer = getAnswerText(questions[activeQuestionIndex], activeQuestionIndex);
			
			// Prepare the prompt for feedback
			const feedbackPrompt = `Question: ${questionText}
				
				User's answer: ${userAnswerText}
				
				Based on the question and user's answer, please provide:
				1. A rating from 1 to 10
				2. 2-3 sentences of constructive feedback
				
				Return ONLY as JSON with this format:
				{"rating": "8", "feedback": "Your feedback here"}
				
				No markdown, no explanation outside the JSON.`;
				
			console.log("Sending feedback request...");
			setDebugInfo({ status: "Requesting feedback from AI..." });
			
			const result = await chatSession.sendMessage(feedbackPrompt);
			const responseText = result.response.text();
			
			console.log("Raw feedback response:", responseText);
			setDebugInfo(prev => ({ ...prev, rawResponse: responseText }));
			
			// Extract JSON from response (handling markdown code blocks if present)
			const jsonResponse = responseText.replace(/```json|```/g, "").trim();
			
			// Try to parse the JSON response
			let jsonFeedbackResponse;
			try {
				jsonFeedbackResponse = JSON.parse(jsonResponse);
				console.log("Successfully parsed JSON:", jsonFeedbackResponse);
			} catch (parseError) {
				console.error("Error parsing feedback JSON:", parseError);
				setDebugInfo(prev => ({ ...prev, parseError: parseError.message }));
				
				// Attempt to fix malformed JSON
				const fixedJson = jsonResponse
					.replace(/(\w+):/g, '"$1":')  // Add quotes to keys
					.replace(/'/g, '"')           // Replace single quotes with double quotes
					.replace(/,\s*}/g, '}')       // Remove trailing commas
					.replace(/(\d+)(?=,|})/, '"$1"'); // Ensure numeric values are quoted
				
				console.log("Attempting to fix JSON:", fixedJson);
				setDebugInfo(prev => ({ ...prev, fixedJson }));
				
				try {
					jsonFeedbackResponse = JSON.parse(fixedJson);
					console.log("Successfully parsed fixed JSON:", jsonFeedbackResponse);
				} catch (secondError) {
					console.error("Still couldn't parse JSON:", secondError);
					setDebugInfo(prev => ({ ...prev, secondError: secondError.message }));
					
					// If still can't parse, create fallback JSON
					jsonFeedbackResponse = {
						rating: "5",
						feedback: "There was an error analyzing your answer. The response looks good, but you could provide more specific details."
					};
				}
			}
			
			// Save feedback to database
			try {
				await db.insert(userAnswer).values({
					interviewIdRef: interviewDetails.interviewId,
					question: questionText,
					correctAns: expectedAnswer || "Not provided",
					userAns: userAnswerText,
					feedback: jsonFeedbackResponse.feedback,
					rating: jsonFeedbackResponse.rating,
					userEmail: user?.primaryEmailAddress?.emailAddress || "guest",
					createdAt: moment().format("DD-MM-YYYY"),
				});
				
				console.log("Answer saved to database");
				setDebugInfo(prev => ({ ...prev, dbSave: "Success" }));
			} catch (dbError) {
				console.error("Failed to save to database:", dbError);
				setDebugInfo(prev => ({ ...prev, dbError: dbError.message }));
				// Continue showing feedback even if DB save fails
			}
			
			// Show feedback to user
			toast.success(
				<div>
					<div className="text-lg font-bold mb-1">Rating: {jsonFeedbackResponse.rating}/10</div>
					<div>{jsonFeedbackResponse.feedback}</div>
				</div>,
				{
					position: "top-center",
					autoClose: false,
					hideProgressBar: false,
					closeOnClick: false,
					pauseOnHover: true,
					draggable: false,
					theme: "dark",
				}
			);

			// Reset state for next question
			setUserAnswerText("");
			setManualSubmitEnabled(false);
			
		} catch (error) {
			console.error("Error generating feedback:", error);
			setDebugInfo(prev => ({ ...prev, error: error.message }));
			
			toast.error(
				<div>
					<div>Failed to generate feedback. Please try again.</div>
					<div className="text-xs mt-1">{error.message}</div>
				</div>,
				{
					position: "top-center",
					autoClose: 5000,
				}
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		navigator.permissions.query({ name: "camera" }).then((permission) => {
			setCameraAllowed(permission.state === "granted");
		});
		navigator.permissions.query({ name: "microphone" }).then((permission) => {
			setMicrophoneAllowed(permission.state === "granted");
		});
	}, []);

	return (
		<div className='text-white flex flex-col justify-center items-center rounded-lg'>
			<ToastContainer />
			{!cameraAllowed && (
				<div className='text-red-500 mb-4'>
					Camera access is required to use this feature. Please enable camera
					access in your browser settings.
				</div>
			)}
			{!microphoneAllowed && (
				<div className='text-red-500 mb-4'>
					Microphone access is required to record your answer. Please enable
					microphone access in your browser settings.
				</div>
			)}

			{!hasActiveQuestion && (
				<div className='text-yellow-500 mb-4 p-4 border border-yellow-600 rounded'>
					Please select a question from the left panel to start the interview.
				</div>
			)}

			{cameraAllowed && (
				<Webcam
					mirrored={true}
					style={{
						height: 400,
						width: "100%",
						zIndex: 10,
						transform: "translateY(-120px)",
					}}
				/>
			)}

			{/* Transcript display */}
			{hasActiveQuestion && userAnswerText && (
				<div className="w-full px-4 mb-4 max-h-40 overflow-y-auto bg-gray-800 border border-gray-700 rounded p-3 text-sm">
					<div className="font-medium text-gray-400 mb-1">Your Answer:</div>
					{userAnswerText}
				</div>
			)}

			<div className="flex gap-4">
				<button
					type='button'
					onClick={handleRecordingToggle}
					disabled={!hasActiveQuestion || loading}
					className={`py-2.5 px-5 text-lg font-medium text-gray-900 focus:outline-none bg-white rounded-lg border hover:border-gray-500 border-gray-700 hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-950 dark:border-gray-600 dark:text-white ${
						!hasActiveQuestion || loading ? 'opacity-50 cursor-not-allowed' : 'dark:hover:bg-gray-950'
					}`}
				>
					{loading ? "Processing..." : isRecording ? "Stop Recording" : "Record Answer"}
				</button>

				{manualSubmitEnabled && (
					<button
						type='button'
						onClick={submitAnswer}
						disabled={loading}
						className={`py-2.5 px-5 text-lg font-medium text-white rounded-lg border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 focus:outline-none ${
							loading ? 'opacity-50 cursor-not-allowed' : ''
						}`}
					>
						Submit Answer
					</button>
				)}
			</div>

			{/* Debug info (only visible in development) */}
			{process.env.NODE_ENV === "development" && debugInfo && (
				<div className="mt-8 p-3 text-xs bg-gray-900 border border-gray-800 rounded-md w-full overflow-x-auto">
					<div className="font-bold mb-1">Debug Info:</div>
					<pre>{JSON.stringify(debugInfo, null, 2)}</pre>
				</div>
			)}
		</div>
	);
};

export default Answer;

"use client";
import React, { useState } from "react";
import { FaLightbulb, FaVolumeDown } from "react-icons/fa";

const Questions = ({ questions, activeQuestionIndex, setActiveQuestionIndex }) => {
	const handleQuestionClick = (index) => {
		setActiveQuestionIndex((prevIndex) => (prevIndex === index ? null : index));
	};

	const handleSpeak = (text) => {
		if (window.speechSynthesis) {
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = "en-US"; 
			window.speechSynthesis.speak(utterance);
		} else {
			alert("Speech Synthesis not supported in this browser.");
		}
	};

	// Ensure questions is an array to prevent .map errors
	const isValidQuestions = Array.isArray(questions) && questions.length > 0;

	// Function to get question text safely from different formats
	const getQuestionText = (questionObj, index) => {
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

	return (
		<div className='p-6 bg-black min-h-screen ml-28 mt-20'>
			<div className='flex flex-col space-y-4'>
				{!isValidQuestions && (
					<div className="text-yellow-500 p-4 border border-yellow-700 rounded-lg">
						Loading questions or no questions available...
					</div>
				)}
				
				{isValidQuestions &&
					questions.map((question, index) => (
						<div
							key={index}
							onClick={() => handleQuestionClick(index)}
							className={`flex flex-col p-4 rounded-lg border cursor-pointer ${
								activeQuestionIndex === index
									? "bg-gray-900 border-gray-600 text-white"
									: "bg-black border-gray-700 text-gray-300"
							} transition-all duration-300 ease-in-out`}
						>
							<div className='flex items-center gap-3'>
								<h2 className='text-lg font-semibold mb-2'>
									Question {index + 1}
								</h2>
								<div
									className='text-white mb-2 size-4 cursor-pointer'
									onClick={(e) => {
										e.stopPropagation(); 
										handleSpeak(getQuestionText(question, index)); 
									}}
								>
									<FaVolumeDown />
								</div>
							</div>
							{activeQuestionIndex === index && (
								<p className='text-sm'>{getQuestionText(question, index)}</p>
							)}
						</div>
					))}
				<div className='border border-gray-600 rounded-lg p-5 bg-gray-700 my-10'>
					<h2 className='text-white flex gap-2 items-center'>
						<FaLightbulb />
						<strong>Note :</strong>
					</h2>
					<div className="text-white py-2 text-sm pl-1">
						Make sure you record the answer to get the rating and feedback !
					</div>
				</div>
			</div>
		</div>
	);
};

export default Questions;

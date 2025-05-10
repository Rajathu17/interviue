"use client";
import { db } from "@/neon";
import { interview } from "@/neon/schema";
import { eq, param } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import Webcam from "react-webcam";
import styles from "../../Dashboard.module.css";
import Button from "../_components/Button";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Page = ({ params }) => {
  const [interviewDetails, setInterviewDetails] = useState();
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const fetchInterviewContent = async () => {
      const response = await db
        .select()
        .from(interview)
        .where(eq(interview.interviewId, params.interviewId));
      setInterviewDetails(response[0]);
    };
    fetchInterviewContent();
  }, [params.interviewId]);

  return (
		<div className={styles.background}>
			<h2 className="text-3xl font-bold text-white text-center mt-10 mb-8">Interview Preparation</h2>
			<div>
				<main className='flex justify-center items-center px-8 py-10 max-md:px-5'>
					<div className='px-14 w-full max-w-screen-xl max-md:px-5 max-md:max-w-full'>
						<div className='flex gap-5 max-md:flex-col'>
							<div className='flex flex-col w-6/12 max-md:ml-0 max-md:w-full mr-32 '>
								{webcamEnabled ? (
									<Webcam
										audio={true}
										onUserMedia={() => setWebcamEnabled(true)}
										onUserMediaError={() => setWebcamEnabled(false)}
										mirrored='false'
										style={{
											width: 900,
											marginTop: 50,
											marginRight: 100,
											borderRadius: "100%",
										}}
									/>
								) : (
									<div className="flex flex-col items-center">
										{interviewDetails?.coverImage ? (
											<Image
												src={interviewDetails.coverImage}
												alt='Interview preparation visual'
												width='400'
												height='300'
												className='w-full aspect-video rounded-lg shadow-lg max-md:mt-10 max-md:max-w-full'
											/>
										) : (
											<Image
												src='/side-img.png'
												alt='Interview preparation visual'
												width='300'
												height='300'
												className='w-full aspect-square max-md:mt-10 max-md:max-w-full'
											/>
										)}
										
										{interviewDetails && (
											<div className="bg-gray-900 p-6 rounded-lg mt-6 w-full border border-gray-800">
												<h3 className="text-xl font-semibold text-white mb-4">Interview Details</h3>
												<div className="space-y-3">
													<div>
														<p className="text-gray-400 text-sm">Role</p>
														<p className="text-white">{interviewDetails.role || "Not specified"}</p>
													</div>
													
													<div>
														<p className="text-gray-400 text-sm">Experience Level</p>
														<p className="text-white">
															{interviewDetails.level === "junior" ? "Junior" : 
															 interviewDetails.level === "mid" ? "Mid-level" : 
															 interviewDetails.level === "senior" ? "Senior" : 
															 interviewDetails.level || "Not specified"}
														</p>
													</div>
													
													{interviewDetails.techstack && (
														<div>
															<p className="text-gray-400 text-sm">Technologies</p>
															<p className="text-white">{interviewDetails.techstack}</p>
														</div>
													)}
													
													<div>
														<p className="text-gray-400 text-sm">Type</p>
														<p className="text-white">
															{interviewDetails.type === "technical" ? "Technical Focus" : 
															 interviewDetails.type === "behavioral" ? "Behavioral Focus" : 
															 interviewDetails.type === "balanced" ? "Balanced" :
															 interviewDetails.type === "resume" ? "Resume-Based" :
															 interviewDetails.type || "Standard"}
														</p>
													</div>
													
													<div>
														<p className="text-gray-400 text-sm">Created</p>
														<p className="text-white">{interviewDetails.createdAt}</p>
													</div>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
							<div className='flex flex-col ml-5 w-6/12 max-md:ml-0 max-md:w-full'>
								<div className='flex flex-col grow py-11 text-base font-bold text-white max-md:mt-10 max-md:max-w-full'>
									<h1 className='text-4xl font-semibold max-md:max-w-full max-md:text-4xl max-md:leading-[54px]'>
										Activate your webcam and microphone to begin the interview.
									</h1>
									<p className='mt-6 font-light leading-6 max-md:max-w-full'>
										Your AI-generated interview includes {interviewDetails && JSON.parse(interviewDetails.jsonquestionsrespnse).length || "several"} questions. 
										Ensure you record your answers to receive AI-generated feedback.
									</p>
									<button
										onClick={() => {
											setWebcamEnabled(true);
										}}
										className='self-start px-5 py-4 mt-6 whitespace-nowrap border border-solid bg-zinc-800 border-gray-950 rounded-[50px] tracking-[2px]'
									>
										ENABLE CAMERA
									</button>
									<button
										onClick={() => {
											router.push(
												"/dashboard/interview/" + params.interviewId + "/start"
											);
										}}
										className='px-6 py-4 mt-6 bg-indigo-600 border border-violet-600 border-solid rounded-[50px] tracking-[2px] max-md:px-5 max-md:max-w-full'
									>
										START THE INTERVIEW
									</button>
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};

export default Page;

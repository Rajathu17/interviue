const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=".repeat(60));
console.log("Interview Questions Generator Setup");
console.log("=".repeat(60));

// Create a fallback set of questions in case generation fails
function createFallbackQuestions() {
  return [
    {
      question: "What is your experience with React and TypeScript?",
      answer: "Discuss your experience with React components, hooks, and TypeScript type definitions."
    },
    {
      question: "How do you approach responsive design using CSS?",
      answer: "Talk about media queries, flexbox, CSS Grid, and mobile-first development."
    },
    {
      question: "Describe a challenging technical problem you solved recently.",
      answer: "Explain the problem, your approach, and the solution you implemented."
    },
    {
      question: "How do you manage state in a complex React application?",
      answer: "Discuss state management solutions like React Context, Redux, or other approaches."
    },
    {
      question: "What strategies do you use for testing your code?",
      answer: "Talk about unit tests, integration tests, and testing libraries you're familiar with."
    }
  ];
}

async function setup() {
  try {
    // Check for .env.local file
    const envPath = path.join(__dirname, '..', '.env.local');
    let apiKey = "";
    
    if (fs.existsSync(envPath)) {
      console.log("Found existing .env.local file.");
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.+)/);
      
      if (match && match[1]) {
        apiKey = match[1];
        console.log("Found existing API key.");
      }
    }
    
    if (!apiKey) {
      apiKey = await new Promise(resolve => {
        rl.question("Enter your Google Gemini API key: ", answer => {
          resolve(answer.trim());
        });
      });
      
      if (!apiKey) {
        throw new Error("API key is required to generate questions.");
      }
      
      // Create/update .env.local file
      const envContent = `# Gemini API key\nNEXT_PUBLIC_GEMINI_API_KEY=${apiKey}`;
      fs.writeFileSync(envPath, envContent);
      console.log("Created .env.local file with your API key.");
    }
    
    // Ensure the generated-questions.json file exists
    const jsonPath = path.join(__dirname, 'generated-questions.json');
    
    // Create a basic file with fallback questions if it doesn't exist
    if (!fs.existsSync(jsonPath)) {
      console.log("Creating default questions file to ensure HTML works properly...");
      const fallbackQuestions = createFallbackQuestions();
      fs.writeFileSync(jsonPath, JSON.stringify(fallbackQuestions, null, 2));
      console.log("Created fallback questions file.");
    }
    
    console.log("\n1. Generating interview questions...");
    try {
      // Run the generate-questions.js script
      execSync('node generate-questions.js', { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
      
      console.log("\n2. Opening interview questions page...");
      // Open the interview.html file in the default browser
      const htmlPath = path.join(__dirname, 'interview.html');
      
      // Determine the platform-specific command to open the HTML file
      const openCommand = process.platform === 'win32' ? 'start' :
                          process.platform === 'darwin' ? 'open' : 'xdg-open';
      
      execSync(`${openCommand} "${htmlPath}"`);
      
      console.log("\nSetup complete!");
      console.log("You can view the interview questions in your browser.");
      
    } catch (error) {
      console.error("Error running generate-questions.js script:", error.message);
      console.log("Opening interview page with fallback questions...");
      
      // Even if generation fails, still open the HTML page which will use the fallback questions
      const htmlPath = path.join(__dirname, 'interview.html');
      const openCommand = process.platform === 'win32' ? 'start' :
                          process.platform === 'darwin' ? 'open' : 'xdg-open';
      
      try {
        execSync(`${openCommand} "${htmlPath}"`);
      } catch (openError) {
        console.error("Error opening HTML file:", openError.message);
        console.log("Please open the file manually:", htmlPath);
      }
    }
    
  } catch (error) {
    console.error("\nSetup failed:", error.message);
  } finally {
    rl.close();
  }
}

setup(); 
const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID,
  location: process.env.GCP_LOCATION
});

export default genAI;
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client using your secure environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  // Allow only POST requests from your PWA frontend
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { audioData, mimeType } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Missing audio data payload.' });
    }

    // Strip the data URL prefix if sent as base64 (e.g., "data:audio/webm;base64,...")
    const base64Data = audioData.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Send the raw audio buffer directly to Gemini 2.5 Flash for multimodal processing
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: mimeType || 'audio/webm'
          }
        },
        {
          text: `You are an intelligent executive assistant processing a rapid voice memo. 
          Analyze the user's audio and return a JSON object with the following structure:
          {
            "transcript": "Exact transcription of what was said",
            "intentType": "action" (if the user requested a specific task like adding an item to a list or calendar) OR "note" (if it is a random thought, journal entry, or brain dump),
            "parsedAction": {
               "action": "ADD_ITEM" | "CREATE_CALENDAR" | "SAVE_INBOX",
               "payload": { ... extracted details ... }
            },
            "summary": "A clean 1-sentence summary of the action taken or note captured."
          }
          Return ONLY valid JSON.`
        }
      ]
    });

    // Parse the JSON response returned by Gemini
    let resultJson;
    try {
      const rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(rawText);
    } catch (parseErr) {
      resultJson = {
        transcript: response.text,
        intentType: 'note',
        summary: 'Captured voice note.'
      };
    }

    // 2. Route based on intent (Take action or store in Unresolved Inbox)
    if (resultJson.intentType === 'action') {
      // TODO: Hook up your specific tool integrations here (e.g., Google Calendar API, Sheets API, etc.)
      console.log('Action executed:', resultJson.parsedAction);
    }

    return res.status(200).json({
      success: true,
      data: resultJson
    });

  } catch (error) {
    console.error('Error processing voice memo:', error);
    return res.status(500).json({ error: 'Failed to process voice memo on server.', details: error.message });
  }
}
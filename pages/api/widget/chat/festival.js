// API Route to detect current Indian festival using OpenAI
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const SETTINGS_KEYS = {
  AI_API_KEYS: 'ai_api_keys', // OpenAI keys stored in plain text (no encryption)
  AI_ENABLED: 'ai_enabled'
};

async function getOpenAIApiKey() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        category: 'ai'
      }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    // Check if AI is enabled
    if (settingsObj[SETTINGS_KEYS.AI_ENABLED] !== 'true') {
      return null;
    }

    // Get OpenAI key (stored in plain text, no decryption needed)
    if (settingsObj[SETTINGS_KEYS.AI_API_KEYS]) {
      const keysData = JSON.parse(settingsObj[SETTINGS_KEYS.AI_API_KEYS]);
      if (keysData.openai) {
        return keysData.openai.trim();
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get OpenAI API key
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      return res.status(503).json({ 
        success: false, 
        message: 'OpenAI API is not configured',
        festival: null
      });
    }

    const openai = new OpenAI({ apiKey });

    // Get current date information
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });

    // Call OpenAI to detect current festival
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that identifies Indian festivals and important events based on dates. 
          Today's date is: ${dateStr} (Indian Standard Time).
          
          Please identify if today is a major Indian festival or important event. Consider:
          - Hindu festivals (Diwali, Holi, Dussehra, Navratri, Ganesh Chaturthi, Janmashtami, Raksha Bandhan, etc.)
          - National holidays (Republic Day, Independence Day, Gandhi Jayanti)
          - Regional festivals (Onam, Pongal, Baisakhi, Ugadi, etc.)
          - Islamic festivals (Eid ul-Fitr, Eid ul-Adha, Muharram)
          - Christian festivals (Christmas, Good Friday, Easter)
          - Sikh festivals (Guru Nanak Jayanti, Baisakhi)
          - Other important days (New Year, New Year's Eve)
          
          You MUST respond with ONLY a valid JSON object, no other text. Use this exact format:
          {
            "isFestival": true or false,
            "festivalName": "Festival Name" or null,
            "greeting": "Custom greeting message" or null,
            "emoji": "relevant emoji" or null
          }
          
          If it's not a festival day, return: {"isFestival": false, "festivalName": null, "greeting": null, "emoji": null}
          Keep greetings warm, friendly, and culturally appropriate.`
        },
        {
          role: 'user',
          content: `What festival or important event is happening today (${dateStr})? Respond with JSON only.`
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    
    // Parse JSON response
    let festivalData;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        festivalData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return res.status(200).json({
        success: true,
        festival: null,
        message: 'Could not parse festival data'
      });
    }

    // Cache the result in response (client can cache for the day)
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    res.status(200).json({
      success: true,
      festival: festivalData.isFestival ? {
        name: festivalData.festivalName,
        greeting: festivalData.greeting,
        emoji: festivalData.emoji
      } : null,
      date: dateStr
    });

  } catch (error) {
    console.error('Error detecting festival:', error);
    res.status(500).json({
      success: false,
      message: 'Error detecting festival',
      festival: null,
      error: error.message
    });
  }
}


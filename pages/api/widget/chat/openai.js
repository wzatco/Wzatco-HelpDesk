// Widget API - OpenAI Chat Completion (Server-side only)
import { PrismaClient } from '@prisma/client';
import { decryptApiKey } from '@/lib/crypto-utils';

// Prisma singleton pattern
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

const SETTINGS_KEYS = {
  AI_API_KEYS_ENCRYPTED: 'ai_api_keys_encrypted',
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

    // Get encrypted OpenAI key
    if (settingsObj[SETTINGS_KEYS.AI_API_KEYS_ENCRYPTED]) {
      const encryptedData = JSON.parse(settingsObj[SETTINGS_KEYS.AI_API_KEYS_ENCRYPTED]);
      if (encryptedData.openai) {
        return decryptApiKey(encryptedData.openai);
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    return null;
  }
}

async function getFeedbackInsights() {
  try {
    // Get recent negative feedback to identify common issues
    const negativeFeedback = await prisma.chatFeedback.findMany({
      where: {
        rating: 'dislike',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        },
        feedback: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Get positive feedback with user messages and AI responses for pattern analysis
    const positiveFeedback = await prisma.chatFeedback.findMany({
      where: {
        rating: 'like',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        userMessage: {
          not: null
        },
        aiResponse: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Get more positive feedback for better pattern analysis
    });

    // Extract common issues from negative feedback
    const commonIssues = [];
    if (negativeFeedback.length > 0) {
      const issueCounts = {};
      negativeFeedback.forEach(fb => {
        if (fb.feedback) {
          // Simple keyword extraction (can be enhanced with NLP)
          const keywords = fb.feedback.toLowerCase().split(/\s+/);
          keywords.forEach(keyword => {
            if (keyword.length > 4) { // Ignore short words
              issueCounts[keyword] = (issueCounts[keyword] || 0) + 1;
            }
          });
        }
      });
      
      // Get top 5 most common issues
      const sortedIssues = Object.entries(issueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([keyword]) => keyword);
      
      commonIssues.push(...sortedIssues);
    }

    // Extract successful patterns from positive feedback
    const successfulPatterns = {
      topics: [], // Topics that get positive feedback
      responseStyles: [], // Response characteristics that work well
      commonQueries: [] // User queries that received positive feedback
    };

    if (positiveFeedback.length > 0) {
      // Analyze topics from user messages that received positive feedback
      const topicCounts = {};
      const queryPatterns = {};
      
      positiveFeedback.forEach(fb => {
        if (fb.userMessage) {
          // Extract keywords from user messages (what users asked about)
          const userKeywords = fb.userMessage.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 4 && !['what', 'how', 'when', 'where', 'which', 'about'].includes(word));
          
          userKeywords.forEach(keyword => {
            topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
          });

          // Track query patterns (first few words of successful queries)
          const queryStart = fb.userMessage.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
          if (queryStart.length > 5) {
            queryPatterns[queryStart] = (queryPatterns[queryStart] || 0) + 1;
          }
        }

        // Analyze AI response characteristics that work well
        if (fb.aiResponse) {
          // Extract response style indicators
          const response = fb.aiResponse.toLowerCase();
          
          // Check for helpful patterns in successful responses
          if (response.includes('step') || response.includes('first') || response.includes('then')) {
            successfulPatterns.responseStyles.push('step-by-step');
          }
          if (response.includes('try') || response.includes('check') || response.includes('verify')) {
            successfulPatterns.responseStyles.push('actionable');
          }
          if (response.includes('example') || response.includes('for instance')) {
            successfulPatterns.responseStyles.push('examples');
          }
        }
      });

      // Get top 5 most successful topics
      const sortedTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);
      
      successfulPatterns.topics = sortedTopics;

      // Get top 3 most common successful query patterns
      const sortedQueries = Object.entries(queryPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([query]) => query);
      
      successfulPatterns.commonQueries = sortedQueries;

      // Get most common response styles (count occurrences)
      const styleCounts = {};
      successfulPatterns.responseStyles.forEach(style => {
        styleCounts[style] = (styleCounts[style] || 0) + 1;
      });
      successfulPatterns.responseStyles = Object.entries(styleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([style]) => style);
    }

    return {
      negativeCount: negativeFeedback.length,
      positiveCount: positiveFeedback.length,
      commonIssues: commonIssues,
      recentNegativeFeedback: negativeFeedback.slice(0, 5).map(fb => ({
        feedback: fb.feedback,
        category: fb.category
      })),
      successfulPatterns: successfulPatterns,
      topPositiveExamples: positiveFeedback.slice(0, 3).map(fb => ({
        userMessage: fb.userMessage?.substring(0, 100) || '',
        aiResponse: fb.aiResponse?.substring(0, 200) || ''
      }))
    };
  } catch (error) {
    console.error('Error getting feedback insights:', error);
    return {
      negativeCount: 0,
      positiveCount: 0,
      commonIssues: [],
      recentNegativeFeedback: [],
      successfulPatterns: {
        topics: [],
        responseStyles: [],
        commonQueries: []
      },
      topPositiveExamples: []
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [], userName } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Get OpenAI API key
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      return res.status(503).json({ 
        success: false, 
        message: 'OpenAI API is not configured. Please configure it in Admin Settings.' 
      });
    }

    // Get feedback insights to improve AI responses
    const feedbackInsights = await getFeedbackInsights();
    
    // Fetch product tutorials for context and AI selection
    let tutorialsContext = '';
    let selectedTutorials = []; // Tutorials selected by AI for this query
    let needsProductSelection = false; // Flag to indicate if product selection is needed
    let requestedTutorialType = null; // Tutorial type requested (when product is missing)
    let requestedTutorialTypeLabel = null;
    let needsCategoryProductSelection = false; // Flag to indicate if category-based product selection is needed
    let categoryName = null; // Category name if category is detected
    let categoryProductsList = []; // Products from the detected category
    try {
      // Check if message is asking for tutorials/manuals/videos - expanded keywords to be more proactive
      const tutorialKeywords = /(tutorial|manual|guide|video|demo|cleaning|setup|instruction|how to|watch|download|pdf|document|help.*clean|help.*demo|need.*video|want.*video|show.*video|see.*video|available.*video|any.*video)/i;
      const isTutorialQuery = tutorialKeywords.test(message);

      if (isTutorialQuery) {
        const tutorialsResponse = await prisma.productTutorial.findMany({
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true
              }
            }
          },
          where: {
            product: {
              isActive: true
            }
          }
        });

        if (tutorialsResponse && tutorialsResponse.length > 0) {
          // Fetch all products with categories for category detection
          const allProducts = await prisma.product.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              category: true
            }
          });
          
          // Extract all product names and categories for validation
          const allProductNames = tutorialsResponse.map(t => t.product?.name?.toLowerCase() || '').filter(Boolean);
          const allCategories = [...new Set(allProducts.map(p => p.category?.toLowerCase()).filter(Boolean))];
          
          // Check if any product name is mentioned in the message (case-insensitive)
          const messageLower = message.toLowerCase();
          const productMentioned = allProductNames.some(productName => 
            messageLower.includes(productName.toLowerCase())
          );
          
          // Check if a category is mentioned instead of a product name
          let categoryMentioned = null;
          let categoryProducts = [];
          if (!productMentioned) {
            for (const category of allCategories) {
              if (messageLower.includes(category.toLowerCase())) {
                categoryMentioned = category;
                // Get products from this category that have tutorials
                const categoryProductIds = allProducts
                  .filter(p => p.category?.toLowerCase() === category.toLowerCase())
                  .map(p => p.id);
                categoryProducts = tutorialsResponse
                  .filter(t => categoryProductIds.includes(t.productId))
                  .map(t => ({
                    id: t.productId,
                    name: t.product?.name || 'Unknown Product'
                  }));
                break;
              }
            }
          }
          
          // Use AI to select relevant tutorials based on user query
          const tutorialsList = tutorialsResponse.map((tutorial, index) => {
            const productName = tutorial.product?.name || 'Unknown Product';
            let tutorialInfo = `${index + 1}. Product: ${productName} (ID: ${tutorial.id})\n`;
            if (tutorial.manualLink) {
              tutorialInfo += `   - Manual/PDF: Available\n`;
            }
            if (tutorial.demoVideoLink) {
              tutorialInfo += `   - Demo Video: Available\n`;
            }
            if (tutorial.cleaningVideoLink) {
              tutorialInfo += `   - Cleaning Video: Available\n`;
            }
            return tutorialInfo;
          }).join('\n');
          
          const tutorialSelectionPrompt = `You are a helpful assistant that selects relevant product tutorials for customer queries.
Customer Query: "${message}"
Available Product Names: ${allProductNames.join(', ')}
Available Product Tutorials:
${tutorialsList}

CRITICAL RULES:
1. If the customer's query mentions a tutorial type (demo video, cleaning video, manual, tutorial, guide) but does NOT explicitly mention one of the available product names listed above, you MUST set "needsProductSelection" to true and return an empty "selectedTutorials" array.
2. Only return tutorials in "selectedTutorials" if the customer explicitly mentioned a specific product name from the available products list.
3. Generic terms like "my projector", "the projector", "projector" without a product name should trigger product selection.

Respond with ONLY a valid JSON object. Use this exact format:
{
  "needsProductSelection": true or false,
  "tutorialType": "manualLink" | "demoVideoLink" | "cleaningVideoLink" | null,
  "tutorialTypeLabel": "Manual" | "Demo Video" | "Cleaning Video" | null,
  "selectedTutorials": [
    {
      "tutorialId": "tutorial_id",
      "productId": "product_id",
      "productName": "Product Name",
      "tutorialType": "manualLink" | "demoVideoLink" | "cleaningVideoLink",
      "tutorialTypeLabel": "Manual" | "Demo Video" | "Cleaning Video"
    }
  ]
}
Examples:
- Query: "I need cleaning video" → {"needsProductSelection": true, "tutorialType": "cleaningVideoLink", "tutorialTypeLabel": "Cleaning Video", "selectedTutorials": []}
- Query: "I need cleaning video for Legend Optimus" → {"needsProductSelection": false, "tutorialType": "cleaningVideoLink", "tutorialTypeLabel": "Cleaning Video", "selectedTutorials": [{"tutorialId": "...", "productId": "...", "productName": "Legend Optimus", ...}]}
- Query: "help with cleaning my projector" → {"needsProductSelection": true, "tutorialType": "cleaningVideoLink", "tutorialTypeLabel": "Cleaning Video", "selectedTutorials": []}`;

          try {
            const selectionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful assistant that selects relevant product tutorials. Always respond with valid JSON only, using the exact format specified.'
                  },
                  {
                    role: 'user',
                    content: tutorialSelectionPrompt
                  }
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: "json_object" }
              })
            });

            if (selectionResponse.ok) {
              const selectionData = await selectionResponse.json();
              const selectionText = selectionData.choices[0]?.message?.content || '{}';
              
              try {
                const parsedSelection = JSON.parse(selectionText);
                
                // Check if product selection is needed
                if (parsedSelection.needsProductSelection === true) {
                  needsProductSelection = true;
                  requestedTutorialType = parsedSelection.tutorialType || null;
                  requestedTutorialTypeLabel = parsedSelection.tutorialTypeLabel || null;
                  // Clear any selected tutorials if product selection is needed
                  selectedTutorials = [];
                } else if (parsedSelection.selectedTutorials && Array.isArray(parsedSelection.selectedTutorials) && parsedSelection.selectedTutorials.length > 0) {
                  // Only add tutorials if product selection is NOT needed AND tutorials are selected
                  parsedSelection.selectedTutorials.forEach((selected) => {
                    const tutorial = tutorialsResponse.find(t => t.id === selected.tutorialId);
                    if (tutorial) {
                      const link = tutorial[selected.tutorialType];
                      if (link) {
                        selectedTutorials.push({
                          tutorialId: tutorial.id,
                          productId: tutorial.productId,
                          productName: selected.productName || tutorial.product?.name || 'Unknown Product',
                          tutorialType: selected.tutorialType,
                          tutorialTypeLabel: selected.tutorialTypeLabel,
                          link: link
                        });
                      }
                    }
                  });
                } else {
                  // If no tutorials selected and no product selection flag, check if we should ask for product
                  // This is a fallback: if tutorial type is detected but no product, ask for product
                  if (parsedSelection.tutorialType && parsedSelection.tutorialTypeLabel) {
                    needsProductSelection = true;
                    requestedTutorialType = parsedSelection.tutorialType;
                    requestedTutorialTypeLabel = parsedSelection.tutorialTypeLabel;
                    selectedTutorials = [];
                  }
                }
                
                // Check if category was detected instead of product
                if (categoryMentioned && categoryProducts.length > 0 && !productMentioned) {
                  needsCategoryProductSelection = true;
                  categoryName = categoryMentioned;
                  categoryProductsList = categoryProducts;
                  needsProductSelection = false; // Override regular product selection
                  if (parsedSelection.tutorialType) {
                    requestedTutorialType = parsedSelection.tutorialType;
                    requestedTutorialTypeLabel = parsedSelection.tutorialTypeLabel;
                  }
                  selectedTutorials = []; // Clear any tutorials
                  console.log(`[Tutorial Selection] Category "${categoryMentioned}" detected, showing ${categoryProducts.length} products`);
                } else if (!productMentioned && (parsedSelection.tutorialType || requestedTutorialType)) {
                  // Final safety check: if product was not mentioned in the query but tutorial type was detected, force product selection
                  needsProductSelection = true;
                  if (parsedSelection.tutorialType) {
                    requestedTutorialType = parsedSelection.tutorialType;
                    requestedTutorialTypeLabel = parsedSelection.tutorialTypeLabel;
                  }
                  selectedTutorials = []; // Clear any tutorials that might have been selected
                  console.log('[Tutorial Selection] Product name not found in query, forcing product selection');
                }
              } catch (parseError) {
                console.error('Error parsing AI tutorial selection JSON:', parseError);
              }
            }
          } catch (aiError) {
            console.error('Error using AI to select tutorials:', aiError);
          }

          // Build context for AI response
          if (tutorialsResponse.length > 0) {
            tutorialsContext = '\n\nPRODUCT TUTORIALS & GUIDES AVAILABLE:\n';
            tutorialsResponse.forEach((tutorial) => {
              const productName = tutorial.product?.name || 'Unknown Product';
              tutorialsContext += `\nProduct: ${productName}\n`;
              if (tutorial.manualLink) {
                tutorialsContext += `  - Manual/PDF: Available\n`;
              }
              if (tutorial.demoVideoLink) {
                tutorialsContext += `  - Demo Video: Available\n`;
              }
              if (tutorial.cleaningVideoLink) {
                tutorialsContext += `  - Cleaning Video: Available\n`;
              }
            });
            tutorialsContext += '\nIMPORTANT: When customers ask about tutorials, setup guides, manuals, demo videos, cleaning instructions, or ANY help related to these topics, you should proactively offer the relevant tutorial. If the customer does NOT mention a specific product name, mention that they can select their product from the dropdown that will appear below your message. DO NOT include actual links or URLs in your response. The tutorials will be shown separately to the user as previews below your response.';
          }
        }
      }
    } catch (tutorialError) {
      console.error('Error fetching tutorials:', tutorialError);
    }
    
    // Use AI to select relevant Knowledge Base articles
    let kbContext = '';
    let kbArticles = [];
    try {
      // Check if message is just a greeting/short message (don't show articles for these)
      const greetingPatterns = /^(hi|hey|hello|hey there|hi there|greetings|good morning|good afternoon|good evening|thanks|thank you|ok|okay|yes|no|yeah|yep|nope|sure|alright|cool|nice|good|great|awesome|thanks!|thank you!)$/i;
      const isGreeting = greetingPatterns.test(message.trim());
      
      // Only search for articles if it's not just a greeting
      if (!isGreeting) {
        // Fetch all published articles (limit to top 30 most viewed/recent for efficiency)
        const allArticles = await prisma.article.findMany({
          where: {
            status: 'published',
            isPublic: true
          },
          take: 30, // Limit to top 30 for AI processing
          select: {
            id: true,
            title: true,
            content: true,
            slug: true
          },
          orderBy: [
            { views: 'desc' },
            { createdAt: 'desc' }
          ]
        });

        if (allArticles && allArticles.length > 0) {
          // Use AI to select relevant articles
          const articlesList = allArticles.map((article, index) => {
            const cleanContent = article.content.replace(/<[^>]*>/g, '').substring(0, 300);
            return `${index + 1}. [ID: ${article.id}] ${article.title}\n   Summary: ${cleanContent}...`;
          }).join('\n\n');

          const articleSelectionPrompt = `You are a helpful assistant that selects relevant Knowledge Base articles for customer queries.

Customer Query: "${message}"

Available Knowledge Base Articles:
${articlesList}

Based on the customer's query, select the most relevant articles (maximum 3-5 articles). Consider:
- Direct relevance to the question
- Similar topics or related issues
- Articles that could help solve the problem

Respond with ONLY a valid JSON object with this exact structure:
{
  "selectedArticleIds": ["article_id_1", "article_id_2", "article_id_3"]
}

If no articles are relevant, return: { "selectedArticleIds": [] }`;

          try {
            const selectionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful assistant that selects relevant Knowledge Base articles. Always respond with valid JSON only, using the exact format specified.'
                  },
                  {
                    role: 'user',
                    content: articleSelectionPrompt
                  }
                ],
                temperature: 0.3,
                max_tokens: 300,
                response_format: { type: "json_object" }
              })
            });

            if (selectionResponse.ok) {
              const selectionData = await selectionResponse.json();
              const selectionText = selectionData.choices[0]?.message?.content || '{}';
              
              // Parse JSON response
              let selectedIds = [];
              try {
                const parsed = JSON.parse(selectionText);
                if (parsed.selectedArticleIds && Array.isArray(parsed.selectedArticleIds)) {
                  selectedIds = parsed.selectedArticleIds;
                } else if (parsed.articles && Array.isArray(parsed.articles)) {
                  selectedIds = parsed.articles;
                } else if (Array.isArray(parsed)) {
                  selectedIds = parsed;
                }
              } catch (parseError) {
                console.error('Error parsing AI article selection:', parseError);
                // Try to extract IDs from text if JSON parsing fails
                const idMatches = selectionText.match(/"([a-zA-Z0-9_-]+)"/g);
                if (idMatches) {
                  selectedIds = idMatches.map(m => m.replace(/"/g, ''));
                }
              }

              // Get selected articles by ID
              if (selectedIds.length > 0) {
                kbArticles = allArticles.filter(article => 
                  selectedIds.includes(article.id) || selectedIds.includes(article.id.toString())
                );
                
                // Limit to top 5 most relevant
                kbArticles = kbArticles.slice(0, 5);
              }
            }
          } catch (aiError) {
            console.error('Error using AI to select articles:', aiError);
            // Fallback: if AI selection fails, don't show articles
          }
        }
      }
      
      if (kbArticles && kbArticles.length > 0) {
        console.log(`[KB Search] AI selected ${kbArticles.length} articles for query: "${message}"`);
        // Create context from KB articles
        kbContext = '\n\nKNOWLEDGE BASE ARTICLES (Use this information to answer questions):\n';
        kbArticles.forEach((article, index) => {
          // Strip HTML tags for context
          const cleanContent = article.content.replace(/<[^>]*>/g, '').substring(0, 500);
          kbContext += `\n${index + 1}. ${article.title}\n${cleanContent}...\n`;
        });
        kbContext += '\nIMPORTANT: When answering questions, use the Knowledge Base articles provided above to give accurate answers. However, DO NOT include markdown links, URLs, or references like "[Article Title](link)" in your response. Just provide the answer naturally based on the Knowledge Base content. The articles will be shown separately to the user as cards below your response.';
      } else {
        const reason = isGreeting ? ' (greeting message - articles not shown)' : ' (AI found no relevant articles)';
        console.log(`[KB Search] No articles selected for query: "${message}"${reason}`);
      }
    } catch (kbError) {
      console.error('Error fetching KB articles:', kbError);
    }
    
    // Build dynamic system prompt based on feedback
    let systemPrompt = `You are a helpful support assistant for WZATCO, a projector brand. You help customers with:
    - Projector setup and installation
    - Troubleshooting technical issues
    - Product specifications and features
    - Connectivity and WiFi setup
    - General projector-related questions
    - Tutorials, guides, manuals, and video demonstrations

Be friendly, professional, and concise. Always use the Knowledge Base articles provided to give accurate, detailed answers. If you don't know something, suggest checking the knowledge base or contacting support.${kbContext}${tutorialsContext}`;

    // Add user's name for personalization
    if (userName && userName.trim() && userName.toLowerCase() !== 'there' && userName.toLowerCase() !== 'guest') {
      systemPrompt += `\n\nIMPORTANT: The customer's name is ${userName}. Use their name naturally in your responses to create a personalized experience. For example, you can say "Hi ${userName}!" or "${userName}, I'd be happy to help you with that." Use their name occasionally throughout the conversation, but not in every message - keep it natural and friendly.`;
    }

    // Add feedback-based improvements to system prompt
    
    // 1. Learn from NEGATIVE feedback - what to avoid
    if (feedbackInsights.recentNegativeFeedback.length > 0) {
      systemPrompt += `\n\n⚠️ IMPORTANT: Based on recent negative feedback, users have reported issues with: ${feedbackInsights.commonIssues.join(', ')}. Please be extra careful and detailed when addressing these topics.`;
    }

    // 2. Learn from POSITIVE feedback - what works well
    if (feedbackInsights.successfulPatterns && feedbackInsights.successfulPatterns.topics.length > 0) {
      systemPrompt += `\n\n✅ SUCCESS PATTERNS: Based on positive feedback, users appreciate responses about: ${feedbackInsights.successfulPatterns.topics.join(', ')}. Continue using similar approaches for these topics.`;
    }

    if (feedbackInsights.successfulPatterns && feedbackInsights.successfulPatterns.responseStyles.length > 0) {
      const styles = feedbackInsights.successfulPatterns.responseStyles;
      let styleGuidance = '';
      if (styles.includes('step-by-step')) {
        styleGuidance += 'Users appreciate step-by-step instructions. ';
      }
      if (styles.includes('actionable')) {
        styleGuidance += 'Users value actionable advice with specific things to try. ';
      }
      if (styles.includes('examples')) {
        styleGuidance += 'Users find examples helpful. ';
      }
      if (styleGuidance) {
        systemPrompt += `\n\n💡 RESPONSE STYLE: ${styleGuidance.trim()}Incorporate these elements when appropriate.`;
      }
    }

    // 3. Satisfaction rate monitoring
    if (feedbackInsights.negativeCount > 0 && feedbackInsights.positiveCount > 0) {
      const satisfactionRate = (feedbackInsights.positiveCount / (feedbackInsights.positiveCount + feedbackInsights.negativeCount)) * 100;
      if (satisfactionRate < 70) {
        systemPrompt += `\n\n📊 PERFORMANCE: Recent satisfaction rate is ${satisfactionRate.toFixed(0)}%. Focus on providing more accurate, helpful, and detailed responses.`;
      } else if (satisfactionRate >= 85) {
        systemPrompt += `\n\n📊 PERFORMANCE: Recent satisfaction rate is ${satisfactionRate.toFixed(0)}%. Keep up the good work! Continue using clear, helpful, and detailed responses.`;
      }
    }

    // 4. Reinforce successful examples (if available)
    if (feedbackInsights.topPositiveExamples && feedbackInsights.topPositiveExamples.length > 0) {
      systemPrompt += `\n\n📚 SUCCESSFUL EXAMPLES: Here are examples of interactions that received positive feedback:\n`;
      feedbackInsights.topPositiveExamples.forEach((example, index) => {
        if (example.userMessage && example.aiResponse) {
          systemPrompt += `\nExample ${index + 1}:\nUser: "${example.userMessage}"\nYour Response: "${example.aiResponse}"\n`;
        }
      });
      systemPrompt += `\nUse similar approaches, tone, and detail level in your responses.`;
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory.slice(-10), // Last 10 messages for context
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({
        success: false,
        message: errorData.error?.message || 'Failed to get response from OpenAI',
        error: errorData
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    // Format KB articles for response (already fetched above)
    const formattedKbArticles = kbArticles.map(article => ({
      id: article.id || article.slug,
      title: article.title,
      slug: article.slug
    }));

    // Format tutorials for response (already selected above)
    const formattedTutorials = selectedTutorials.map(tutorial => ({
      tutorialId: tutorial.tutorialId,
      productId: tutorial.productId,
      productName: tutorial.productName,
      tutorialType: tutorial.tutorialType,
      tutorialTypeLabel: tutorial.tutorialTypeLabel,
      link: tutorial.link
    }));

    res.status(200).json({
      success: true,
      response: aiResponse,
      kbArticles: formattedKbArticles,
      tutorials: formattedTutorials,
      needsProductSelection: needsProductSelection,
      needsCategoryProductSelection: needsCategoryProductSelection,
      categoryName: categoryName,
      categoryProducts: categoryProductsList,
      requestedTutorialType: requestedTutorialType,
      requestedTutorialTypeLabel: requestedTutorialTypeLabel,
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    console.error('Error in OpenAI chat handler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}


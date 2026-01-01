// Widget API - Save Chat Feedback for AI Training
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { messageId, sessionId, rating, feedback, userEmail, userName, userMessage, aiResponse, category } = req.body;

    if (!messageId || !rating || !['like', 'dislike'].includes(rating)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message ID and rating (like/dislike) are required' 
      });
    }

    // Check if feedback already exists for this message
    const existingFeedback = await prisma.chatFeedback.findFirst({
      where: { messageId }
    });

    let chatFeedback;
    
    if (existingFeedback) {
      // Update existing feedback
      chatFeedback = await prisma.chatFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          rating, // Update rating
          feedback: feedback !== null && feedback !== undefined ? feedback : existingFeedback.feedback, // Update feedback if provided
          userEmail: userEmail || existingFeedback.userEmail || null,
          userName: userName || existingFeedback.userName || null,
          userMessage: userMessage || existingFeedback.userMessage || null,
          aiResponse: aiResponse || existingFeedback.aiResponse || null,
          category: category || existingFeedback.category || null,
        }
      });
    } else {
      // Create new feedback
      chatFeedback = await prisma.chatFeedback.create({
        data: {
          messageId,
          sessionId: sessionId || null,
          rating, // 'like' or 'dislike'
          feedback: feedback || null,
          userEmail: userEmail || null,
          userName: userName || null,
          userMessage: userMessage || null,
          aiResponse: aiResponse || null,
          category: category || null,
        }
      });
    }

    // Analyze feedback patterns for AI improvement
    // Get recent feedback patterns
    const recentFeedback = await prisma.chatFeedback.findMany({
      where: {
        rating: 'dislike',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    // Extract common issues from negative feedback
    const commonIssues = [];
    if (recentFeedback.length > 0) {
      // Group by category or user message patterns
      const issueMap = {};
      recentFeedback.forEach(fb => {
        const key = fb.category || 'general';
        if (!issueMap[key]) {
          issueMap[key] = [];
        }
        if (fb.feedback) {
          issueMap[key].push(fb.feedback);
        }
      });
      
      // Store insights for AI prompt improvement (could be saved to Settings or a separate table)
      console.log('📊 Feedback insights for AI improvement:', issueMap);
    }

    res.status(200).json({
      success: true,
      message: 'Feedback saved successfully',
      feedbackId: chatFeedback.id
    });

  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}


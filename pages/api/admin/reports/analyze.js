import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * AI Analysis for Admin Reports
 * Analyzes helpdesk metrics and provides insights
 */

/**
 * Get AI credentials from database or environment
 */
async function getAICredentials() {
  try {
    const settings = await prisma.settings.findFirst({
      where: { category: 'integrations' }
    });

    if (settings && settings.isAiEnabled) {
      return {
        apiKey: settings.aiApiKey,
        provider: settings.aiProvider || 'openai',
        enabled: settings.isAiEnabled
      };
    }
  } catch (error) {
    console.error('Error fetching AI credentials from database:', error);
  }

  // Fallback to environment variables
  return {
    apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
    provider: process.env.OPENAI_API_KEY ? 'openai' : 'gemini',
    enabled: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)
  };
}

/**
 * Placeholder AI function - Replace with actual AI provider (OpenAI, Anthropic, etc.)
 * @param {string} prompt - The prompt to send to the AI
 * @param {object} credentials - AI credentials from database or env
 * @returns {Promise<string>} - AI response text
 */
async function callAI(prompt, credentials) {
  // Check if AI is enabled
  if (!credentials.enabled) {
    return generateFallbackAnalysis(prompt);
  }

  // Option 1: Use OpenAI
  if (credentials.provider === 'openai' && credentials.apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpdesk analytics expert. Analyze metrics and provide actionable insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('OpenAI API Error:', data.error);
        return generateFallbackAnalysis(prompt);
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return generateFallbackAnalysis(prompt);
    }
  }

  // Option 2: Use Google Gemini
  if (credentials.provider === 'gemini' && credentials.apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${credentials.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpdesk analytics expert. ${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Gemini API Error:', data.error);
        return generateFallbackAnalysis(prompt);
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return generateFallbackAnalysis(prompt);
    }
  }

  // Fallback: For backward compatibility, try environment variables
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpdesk analytics expert. Analyze metrics and provide actionable insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('OpenAI API Error:', data.error);
        return generateFallbackAnalysis(prompt);
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return generateFallbackAnalysis(prompt);
    }
  }

  // Option 2: Use Anthropic Claude (if API key is available)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `You are a helpdesk analytics expert. ${prompt}`
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Anthropic API Error:', data.error);
        return generateFallbackAnalysis(prompt);
      }

      return data.content[0].text;
    } catch (error) {
      console.error('Error calling Anthropic:', error);
      return generateFallbackAnalysis(prompt);
    }
  }

  // Fallback: Rule-based analysis
  return generateFallbackAnalysis(prompt);
}

/**
 * Fallback analysis when AI API is not available
 */
function generateFallbackAnalysis(prompt) {
  // Extract metrics from prompt (basic parsing)
  const metricsMatch = prompt.match(/\{[\s\S]*\}/);
  let metrics = {};
  
  try {
    if (metricsMatch) {
      metrics = JSON.parse(metricsMatch[0]);
    }
  } catch (e) {
    // If parsing fails, return generic analysis
  }

  const analysis = [];
  const improvements = [];
  const recommendations = {
    shortTerm: [],
    mediumTerm: [],
    longTerm: []
  };
  
  // Analyze ticket volume trend
  if (metrics.ticketVolume !== undefined) {
    if (metrics.ticketVolume > 100) {
      analysis.push('**High Ticket Volume**: Your team is handling a significant number of tickets (' + metrics.ticketVolume + '). This indicates strong customer engagement but may strain resources.');
      recommendations.shortTerm.push('Review current agent capacity and consider adding support staff');
      recommendations.mediumTerm.push('Implement ticket categorization and auto-routing to optimize workload distribution');
    } else if (metrics.ticketVolume < 20) {
      analysis.push('**Low Ticket Volume**: Current ticket load is manageable (' + metrics.ticketVolume + ' tickets). This is an opportunity to focus on quality improvements and proactive support.');
      recommendations.shortTerm.push('Focus on creating comprehensive knowledge base articles');
      recommendations.mediumTerm.push('Conduct customer satisfaction surveys to understand service gaps');
    } else {
      analysis.push('**Moderate Ticket Volume**: Ticket volume (' + metrics.ticketVolume + ') is within normal operational range.');
      recommendations.shortTerm.push('Monitor ticket trends to identify emerging patterns');
    }
  }

  // Analyze CSAT
  if (metrics.csatScore !== undefined) {
    if (metrics.csatScore >= 4.5) {
      analysis.push('**Excellent Customer Satisfaction**: CSAT score of ' + metrics.csatScore + '/5 indicates exceptional service quality. Your team is delivering outstanding customer experiences.');
      recommendations.mediumTerm.push('Document best practices from top-performing agents');
      recommendations.longTerm.push('Develop customer success program to maintain high satisfaction levels');
    } else if (metrics.csatScore < 3.0) {
      analysis.push('**Critical: Low Customer Satisfaction**: CSAT score of ' + metrics.csatScore + '/5 is below acceptable levels and requires immediate action.');
      improvements.push('**URGENT**: Customer satisfaction needs immediate improvement. Review all touchpoints in the support journey.');
      recommendations.shortTerm.push('Conduct emergency team training on customer service excellence');
      recommendations.shortTerm.push('Implement quality assurance reviews for all tickets');
      recommendations.mediumTerm.push('Analyze negative feedback patterns and address root causes');
    } else {
      analysis.push('**CSAT Requires Attention**: Current satisfaction score of ' + metrics.csatScore + '/5 shows room for improvement. Focus on response quality and resolution effectiveness.');
      recommendations.shortTerm.push('Review first response times and resolution quality');
      recommendations.mediumTerm.push('Implement agent coaching program based on customer feedback');
    }
  }

  // Analyze SLA compliance
  if (metrics.slaCompliance !== undefined) {
    if (metrics.slaCompliance >= 90) {
      analysis.push('**Strong SLA Performance**: SLA compliance at ' + metrics.slaCompliance + '% demonstrates consistent service delivery. Your team is meeting contractual obligations effectively.');
      recommendations.mediumTerm.push('Maintain current processes and document successful workflows');
    } else if (metrics.slaCompliance < 70) {
      analysis.push('**SLA Breach Risk**: SLA compliance at ' + metrics.slaCompliance + '% is below target and poses contractual risks.');
      improvements.push('**HIGH PRIORITY**: SLA breaches can damage customer relationships and contractual standing.');
      recommendations.shortTerm.push('Optimize ticket routing and prioritization rules');
      recommendations.shortTerm.push('Review agent availability during peak hours');
      recommendations.mediumTerm.push('Implement escalation workflows for at-risk tickets');
    } else {
      analysis.push('**SLA Compliance Needs Improvement**: At ' + metrics.slaCompliance + '%, there is room to improve service level adherence.');
      recommendations.shortTerm.push('Analyze SLA breach patterns to identify bottlenecks');
      recommendations.mediumTerm.push('Review and adjust agent workload distribution');
    }
  }

  // Analyze agent performance
  if (metrics.totalAgents !== undefined) {
    analysis.push('**Team Size**: Currently operating with ' + metrics.totalAgents + ' agents.');
    if (metrics.avgResolutionRate) {
      analysis.push('**Resolution Performance**: Average resolution rate is ' + metrics.avgResolutionRate + '%.');
    }
  }

  // Add critical area for improvement if not already added
  if (improvements.length === 0) {
    if (metrics.csatScore && metrics.csatScore < 3.5) {
      improvements.push('**Priority Focus**: Customer satisfaction scores indicate service quality issues that need addressing.');
    } else if (metrics.slaCompliance && metrics.slaCompliance < 80) {
      improvements.push('**Priority Focus**: SLA compliance gaps require attention to maintain service standards.');
    } else {
      improvements.push('**Continue Excellence**: Current performance is satisfactory. Focus on continuous improvement and innovation.');
    }
  }

  // Add default recommendations if none exist
  if (recommendations.shortTerm.length === 0) {
    recommendations.shortTerm.push('Continue monitoring key metrics weekly');
  }
  if (recommendations.mediumTerm.length === 0) {
    recommendations.mediumTerm.push('Develop comprehensive training program for support team');
    recommendations.mediumTerm.push('Expand self-service knowledge base');
  }
  if (recommendations.longTerm.length === 0) {
    recommendations.longTerm.push('Invest in AI-powered automation for routine inquiries');
    recommendations.longTerm.push('Build predictive analytics for proactive support');
  }

  return `
## Executive Summary

${analysis.length > 0 ? 'This period shows ' + (metrics.ticketVolume || 'N/A') + ' tickets processed with notable performance in service delivery. ' : ''}The analysis below provides detailed insights into helpdesk operations and recommendations for improvement.

## Key Performance Indicators

${analysis.length > 0 ? analysis.map((item) => '- ' + item).join('\n') : '- Insufficient data for comprehensive analysis'}

## Key Trends

${analysis.slice(0, 3).map((item, i) => `**Trend ${i + 1}**: ${item.replace(/^\*\*[^:]+:\*\*\s*/, '')}`).join('\n\n')}

## Critical Areas Requiring Immediate Attention

${improvements.length > 0 ? improvements.join('\n\n') : '**Status**: No critical issues detected. Continue monitoring metrics for emerging patterns.'}

## Actionable Recommendations

**Immediate Actions (Next 7 Days)**
${recommendations.shortTerm.map((item) => '- ' + item).join('\n')}

**Short-Term Improvements (1-3 Months)**
${recommendations.mediumTerm.map((item) => '- ' + item).join('\n')}

**Long-Term Strategic Initiatives (3-12 Months)**
${recommendations.longTerm.map((item) => '- ' + item).join('\n')}

## Comparative Insights

- **Industry Benchmark**: Typical helpdesk CSAT scores range from 3.5-4.2/5
- **SLA Standard**: Most organizations target 85-95% SLA compliance
- **Resolution Rate**: High-performing teams achieve 80%+ first-contact resolution

## Next Steps

1. Schedule a team meeting to review these findings
2. Assign owners to each priority recommendation
3. Set up weekly metric tracking dashboard
4. Establish feedback loop for continuous improvement

---
*Analysis generated on ${new Date().toLocaleDateString()} • Powered by Helpdesk Analytics Engine*
  `.trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { metrics, dateRange } = req.body;

    if (!metrics) {
      return res.status(400).json({ 
        success: false,
        message: 'Metrics data is required' 
      });
    }

    // Fetch AI credentials from database
    const credentials = await getAICredentials();

    // Check if AI is disabled
    if (!credentials.enabled) {
      return res.status(403).json({
        success: false,
        message: 'AI features are currently disabled. Please enable AI in Admin Settings → Integrations.'
      });
    }

    // Create a concise summary for AI (to avoid token limits)
    const summaryText = `
Report Period: ${dateRange?.startDate || 'N/A'} to ${dateRange?.endDate || 'N/A'}

KEY METRICS:
${metrics.ticketVolume !== undefined ? `- Total Tickets: ${metrics.ticketVolume}` : ''}
${metrics.topProduct ? `- Top Product/Issue: ${metrics.topProduct} (${metrics.topProductCount || 'N/A'} tickets)` : ''}
${metrics.csatScore !== undefined ? `- Customer Satisfaction (CSAT): ${metrics.csatScore}/5.0` : ''}
${metrics.totalFeedbacks !== undefined ? `- Total CSAT Feedbacks: ${metrics.totalFeedbacks}` : ''}
${metrics.slaCompliance !== undefined ? `- SLA Compliance: ${metrics.slaCompliance}%` : ''}
${metrics.exceededTickets !== undefined ? `- Tickets Exceeding SLA: ${metrics.exceededTickets}` : ''}
${metrics.totalAgents !== undefined ? `- Active Agents: ${metrics.totalAgents}` : ''}
${metrics.avgResolutionRate !== undefined ? `- Average Resolution Rate: ${metrics.avgResolutionRate}%` : ''}
${metrics.avgFirstResponse ? `- Average First Response Time: ${metrics.avgFirstResponse}` : ''}
${metrics.csatDistribution ? `- CSAT Ratings Breakdown: 5⭐=${metrics.csatDistribution.ratings?.['5'] || 0}, 4⭐=${metrics.csatDistribution.ratings?.['4'] || 0}, 3⭐=${metrics.csatDistribution.ratings?.['3'] || 0}, 2⭐=${metrics.csatDistribution.ratings?.['2'] || 0}, 1⭐=${metrics.csatDistribution.ratings?.['1'] || 0}` : ''}
    `.trim();

    // Construct AI prompt with concise summary
    const prompt = `You are a senior helpdesk analytics consultant. Analyze the following helpdesk metrics:

${summaryText}

Provide a comprehensive analysis report with the following structure:

**1. Executive Summary**
Provide a 2-3 sentence overview of the helpdesk performance during this period.

**2. Key Performance Indicators**
Analyze the main metrics (ticket volume, resolution rates, response times, satisfaction scores) and explain what they indicate about service quality.

**3. Key Trends** (identify at least 3)
Identify positive trends, concerning patterns, and notable changes. Use data to support your observations.

**4. Critical Areas Requiring Immediate Attention**
Highlight the most urgent issues that need management action. Explain the business impact if left unaddressed.

**5. Actionable Recommendations**
Provide specific, practical recommendations prioritized by impact:
- Short-term actions (immediate)
- Medium-term improvements (1-3 months)
- Long-term strategic initiatives

**6. Comparative Insights**
Compare performance against typical industry benchmarks:
- Industry standard CSAT: 3.5-4.2/5
- Industry standard SLA compliance: 85-95%
- Industry standard first response: Under 2 hours

Use clear formatting with headers and bullet points. Be specific and data-driven in your analysis.`;

    // Call AI provider with fetched credentials
    const analysis = await callAI(prompt, credentials);

    return res.status(200).json({
      success: true,
      analysis,
      metrics,
      generatedAt: new Date().toISOString(),
      aiProvider: credentials.provider === 'openai' ? 'OpenAI' : credentials.provider === 'gemini' ? 'Google Gemini' : 'Fallback Analysis'
    });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error generating analysis',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

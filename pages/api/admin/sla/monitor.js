import SLAService from '../../../../lib/sla-service';

/**
 * SLA Monitor Endpoint
 * This endpoint should be called periodically (e.g., every minute via cron job)
 * to monitor active SLA timers and send notifications
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Run the SLA monitoring service
      await SLAService.monitorTimers();

      return res.status(200).json({
        success: true,
        message: 'SLA monitoring completed',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('SLA Monitor API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

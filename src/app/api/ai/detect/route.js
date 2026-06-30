import { apiJson, handleApiError, requireSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/detect
 *
 * Proxy endpoint for AI gesture detection.
 * Receives a base64 frame from the browser dashcam and forwards it
 * to the AI backend for gesture analysis.
 *
 * Body:
 * - frame: string (base64 data URL of the captured video frame)
 *
 * Returns:
 * - sos_detected: boolean (true if danger gesture was detected)
 * - gesture: string (detected gesture label, if any)
 * - confidence: number (detection confidence, if available)
 */
export async function POST(request) {
  try {
    const session = await requireSession('Unauthorized');

    const body = await request.json();
    const { frame } = body;

    if (!frame) {
      return apiJson({ error: 'Frame data is required' }, 400);
    }

    const aiBackendUrl =
      process.env.AI_BACKEND_URL || 'http://127.0.0.1:5000/detect';

    try {
      const aiResponse = await fetch(aiBackendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: frame,
          userId: session.user.id,
        }),
        // 5 second timeout for AI backend
        signal: AbortSignal.timeout(5000),
      });

      if (!aiResponse.ok) {
        console.error(
          '[AI Detect] Backend returned status:',
          aiResponse.status
        );
        return apiJson({
          sos_detected: false,
          gesture: null,
          confidence: 0,
          error: 'AI backend returned an error',
        });
      }

      const aiData = await aiResponse.json();

      return apiJson({
        sos_detected: aiData.sos_detected || false,
        gesture: aiData.gesture || null,
        confidence: aiData.confidence || 0,
      });
    } catch (fetchError) {
      // AI backend not available — return safe result silently
      // This is expected when the Python AI backend isn't running
      console.log('[AI Detect] Backend unreachable:', fetchError.message);
      return apiJson({
        sos_detected: false,
        gesture: null,
        confidence: 0,
        backend_available: false,
      });
    }
  } catch (error) {
    console.error('[AI Detect] Error:', error);
    return handleApiError(error, 'AI detection failed', 500);
  }
}

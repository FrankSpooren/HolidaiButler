/**
 * API error response helper — bubbles up domain-specific error codes
 * (MediaRequiredError, InvalidTransitionError, etc.) from custom Error
 * classes to the HTTP response so the frontend can map error.code to a
 * localised user message.
 *
 * Before this helper, all schedule/transition endpoints wrapped specific
 * errors in a generic SCHEDULE_ERROR / RESCHEDULE_ERROR / etc with status
 * 500, swallowing the original code + statusCode. The UI could only show
 * the raw English message — no i18n was possible.
 *
 * Usage:
 *   try { ... } catch (err) {
 *     logger.error('[Endpoint] failed:', err);
 *     return sendApiError(res, err, 'SCHEDULE_ERROR');
 *   }
 *
 * Behaviour:
 * - When err.code and err.statusCode are set and statusCode is 4xx, the
 *   response uses BOTH: status = err.statusCode, body.error.code = err.code.
 *   err.details (optional) is forwarded for context.
 * - Otherwise the response falls back to 500 + the fallbackCode argument
 *   (preserves existing behaviour for unexpected errors).
 */

export function sendApiError(res, error, fallbackCode = 'INTERNAL_ERROR') {
  if (
    error &&
    typeof error.code === 'string' &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    });
  }
  return res.status(500).json({
    success: false,
    error: {
      code: fallbackCode,
      message: error?.message || 'Unknown error',
    },
  });
}

export default { sendApiError };

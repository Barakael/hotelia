<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyBpmApiKey
{
    /**
     * Authenticate BPM system requests using a static API key.
     *
     * Expected header:
     *   X-BPM-API-Key: <BPM_API_KEY>
     */
    public function handle(Request $request, Closure $next): Response
    {
        $configured = config('bpm.api_key');

        // If no key is configured, deny access — avoids open access on misconfigured servers
        if (empty($configured)) {
            return response()->json(['message' => 'BPM API key is not configured.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $provided = (string) $request->header('X-BPM-API-Key', '');

        if (empty($provided) || !hash_equals($configured, $provided)) {
            return response()->json(['message' => 'Invalid or missing BPM API key.'], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}

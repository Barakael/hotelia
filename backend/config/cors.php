<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        // Flutter web dev ports
        'http://localhost:58438',
        'http://127.0.0.1:58438',
        'http://localhost:8888',
        'http://127.0.0.1:8888',
        // Mobile app origins
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://192.168.100.137:8000',
        'http://0.0.0.0:8000',
        // Allow all origins for mobile development
        '*',
    ],

    'allowed_origins_patterns' => [
        '#^http://localhost(:[0-9]+)?$#',
        '#^http://127\.0\.0\.1(:[0-9]+)?$#',
        // LAN phone / tablet access (e.g. http://192.168.x.x:5173)
        '#^http://192\.168\.\d{1,3}\.\d{1,3}(:[0-9]+)?$#',
        '#^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:[0-9]+)?$#',
        '#^https://[a-zA-Z0-9\-]+\.ngrok-free\.app$#',
        '#^https://[a-zA-Z0-9\-]+\.ngrok\.io$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];

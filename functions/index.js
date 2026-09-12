'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
    projectId: 'lcnfoundation-registry'
});

const MAX_SELECTION = 8000;
const MAX_INSTRUCTION = 1000;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600'
};

function jsonResponse(res, status, body) {
    Object.keys(CORS_HEADERS).forEach(function (key) {
        res.set(key, CORS_HEADERS[key]);
    });
    res.status(status).json(body);
}

async function verifyBearer(req) {
    const header = req.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        const err = new Error('Missing Authorization bearer token');
        err.status = 401;
        throw err;
    }
    try {
        return await getAuth().verifyIdToken(match[1]);
    } catch (e) {
        const err = new Error('Invalid or expired auth token');
        err.status = 401;
        throw err;
    }
}

function normalizeString(value, max) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, max);
}

exports.editorAskAi = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 30,
        memory: '256MiB',
        cors: false
    },
    async (req, res) => {
        if (req.method === 'OPTIONS') {
            Object.keys(CORS_HEADERS).forEach(function (key) {
                res.set(key, CORS_HEADERS[key]);
            });
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            jsonResponse(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            await verifyBearer(req);

            const body = req.body || {};
            const apiKey = normalizeString(body.apiKey, 200);
            const selection = normalizeString(body.selection, MAX_SELECTION);
            const instruction = normalizeString(body.instruction, MAX_INSTRUCTION);

            if (!apiKey) {
                jsonResponse(res, 400, { error: 'OpenAI API key is required' });
                return;
            }
            if (!selection) {
                jsonResponse(res, 400, { error: 'Selection text is required' });
                return;
            }
            if (!instruction) {
                jsonResponse(res, 400, { error: 'Instruction is required' });
                return;
            }

            const openaiRes = await fetch(OPENAI_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0.4,
                    max_tokens: 1500,
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You edit selected document text. Follow the user instruction exactly. ' +
                                'Return ONLY the replacement text for the selection. ' +
                                'Do not wrap in markdown fences unless the user asks for code/markdown. ' +
                                'Preserve meaning unless asked to change it. Keep a similar tone and formatting where sensible.'
                        },
                        {
                            role: 'user',
                            content:
                                'Instruction:\n' +
                                instruction +
                                '\n\nSelected text:\n' +
                                selection
                        }
                    ]
                })
            });

            const data = await openaiRes.json().catch(function () {
                return null;
            });

            if (!openaiRes.ok) {
                const msg =
                    (data && data.error && data.error.message) ||
                    'OpenAI request failed (' + openaiRes.status + ')';
                jsonResponse(res, openaiRes.status >= 400 && openaiRes.status < 600 ? openaiRes.status : 502, {
                    error: msg
                });
                return;
            }

            const text =
                data &&
                data.choices &&
                data.choices[0] &&
                data.choices[0].message &&
                data.choices[0].message.content;

            if (!text || typeof text !== 'string') {
                jsonResponse(res, 502, { error: 'Empty response from OpenAI' });
                return;
            }

            jsonResponse(res, 200, { text: text.trim() });
        } catch (err) {
            const status = err && err.status ? err.status : 500;
            jsonResponse(res, status, {
                error: err && err.message ? err.message : 'Ask AI failed'
            });
        }
    }
);

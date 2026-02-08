const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { tempDir } = require('../config');

function extractJson(text) {
  if (!text) {
    return null;
  }

  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fencedMatch ? fencedMatch[1] : text;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function ensureTodayTempDir() {
  const day = new Date().toISOString().slice(0, 10);
  const full = path.join(tempDir, day);
  fs.mkdirSync(full, { recursive: true });
  return full;
}

function writeDebugTrace(payload) {
  const dir = ensureTodayTempDir();
  const file = path.join(dir, `${Date.now()}-${uuidv4()}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
}

function normalizeOpenAiMessages(inputText, imageDataUrl) {
  if (!imageDataUrl) {
    return [
      {
        role: 'user',
        content: inputText
      }
    ];
  }

  return [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: inputText
        },
        {
          type: 'image_url',
          image_url: {
            url: imageDataUrl
          }
        }
      ]
    }
  ];
}

async function callOpenAiCompatible(provider, prompt, inputText, imageDataUrl) {
  const url = provider.base_url.replace(/\/$/, '') + '/chat/completions';
  const payload = {
    model: provider.model,
    temperature: provider.temperature ?? 1,
    messages: [
      {
        role: 'system',
        content: prompt
      },
      ...normalizeOpenAiMessages(inputText, imageDataUrl)
    ]
  };

  const headers = provider.api_key
    ? { Authorization: `Bearer ${provider.api_key}` }
    : {};

  const response = await axios.post(url, payload, {
    headers,
    timeout: 60000
  });

  const outputText = response?.data?.choices?.[0]?.message?.content || '';
  return {
    raw: response.data,
    text: outputText,
    parsed: extractJson(outputText)
  };
}

async function callGoogleCompatible(provider, prompt, inputText, imageDataUrl) {
  const modelName = provider.model || 'gemini-1.5-flash';
  const base = provider.base_url.replace(/\/$/, '');
  const keyParam = provider.api_key ? `?key=${encodeURIComponent(provider.api_key)}` : '';
  const url = `${base}/models/${modelName}:generateContent${keyParam}`;

  const parts = [
    {
      text: `${prompt}\n\n${inputText}`
    }
  ];

  if (imageDataUrl) {
    const [, mimeAndData] = imageDataUrl.split(':');
    const [mime, base64] = mimeAndData.split(';base64,');
    parts.push({
      inlineData: {
        mimeType: mime,
        data: base64
      }
    });
  }

  const payload = {
    generationConfig: {
      temperature: provider.temperature ?? 1
    },
    contents: [
      {
        role: 'user',
        parts
      }
    ]
  };

  const response = await axios.post(url, payload, { timeout: 60000 });
  const outputText =
    response?.data?.candidates?.[0]?.content?.parts?.map((x) => x.text).filter(Boolean).join('\n') || '';

  return {
    raw: response.data,
    text: outputText,
    parsed: extractJson(outputText)
  };
}

async function callProvider(provider, prompt, inputText, imageDataUrl) {
  const basePayload = {
    provider: {
      id: provider.id,
      name: provider.name,
      provider_type: provider.provider_type,
      base_url: provider.base_url,
      model: provider.model
    },
    input: {
      text: inputText,
      hasImage: Boolean(imageDataUrl)
    }
  };

  try {
    let result;
    if (provider.provider_type === 'google') {
      result = await callGoogleCompatible(provider, prompt, inputText, imageDataUrl);
    } else {
      result = await callOpenAiCompatible(provider, prompt, inputText, imageDataUrl);
    }

    writeDebugTrace({
      ...basePayload,
      output: result.raw
    });

    return result;
  } catch (error) {
    writeDebugTrace({
      ...basePayload,
      error: {
        message: error.message,
        response: error.response?.data
      }
    });

    throw error;
  }
}

async function fetchModels(provider) {
  if (provider.provider_type === 'google') {
    const base = provider.base_url.replace(/\/$/, '');
    const keyParam = provider.api_key ? `?key=${encodeURIComponent(provider.api_key)}` : '';
    const url = `${base}/models${keyParam}`;
    const response = await axios.get(url, { timeout: 30000 });
    return (response.data.models || []).map((x) => x.name);
  }

  const url = provider.base_url.replace(/\/$/, '') + '/models';
  const headers = provider.api_key ? { Authorization: `Bearer ${provider.api_key}` } : {};
  const response = await axios.get(url, { headers, timeout: 30000 });
  return (response.data.data || []).map((x) => x.id);
}

module.exports = {
  callProvider,
  fetchModels
};

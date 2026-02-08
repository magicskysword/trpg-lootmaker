export async function apiRequest(path, options = {}) {
  const opts = { ...options };
  opts.credentials = 'include';
  opts.headers = opts.headers || {};

  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    if (typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
    }
  }

  const response = await fetch(path, opts);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `请求失败: ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

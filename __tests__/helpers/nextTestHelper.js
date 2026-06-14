/**
 * Next.js API Route Testing Helper
 * This helper allows testing Next.js API routes by mocking the request/response objects
 */

/**
 * Create a mock NextRequest object
 * @param {Object} options - Request options
 * @returns {Object} - Mock request object
 */
function createMockRequest(options = {}) {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body = null,
    searchParams = new URLSearchParams(),
  } = options;

  const urlObj = new URL(url);

  return {
    method,
    url,
    headers: new Map(Object.entries(headers)),
    body,
    json: async () => body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
    get: (name) => headers[name],
  };
}

/**
 * Create a mock NextResponse-like response object
 * @returns {Object} - Mock response object
 */
function createMockResponse() {
  const response = {
    status: 200,
    statusText: 'OK',
    headers: {},
    body: null,
    json: null,
  };

  return {
    json: async (data, init = {}) => {
      response.body = data;
      response.status = init.status || 200;
      response.json = data;
      return {
        json: async () => data,
        status: init.status || 200,
      };
    },
    text: async (data, init = {}) => {
      response.body = data;
      response.status = init.status || 200;
      return {
        text: async () => data,
        status: init.status || 200,
      };
    },
    status: (code) => ({
      json: async (data) => ({
        json: async () => data,
        status: code,
      }),
    }),
  };
}

/**
 * Call a Next.js API route handler function directly
 * @param {Function} handler - The Next.js API route handler (POST, GET, PATCH, etc.)
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Response with status and data
 */
async function callNextHandler(handler, options = {}) {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body = null,
    params = {},
  } = options;

  // Create mock request with headers
  const mockRequest = {
    method,
    url: new URL(url),
    headers: {
      get: (name) => headers[name],
      'x-user-id': headers['x-user-id'],
      'x-user-role': headers['x-user-role'],
    },
    json: async () => body,
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
  };

  // Add URL search params if provided
  if (options.searchParams) {
    const sp = new URLSearchParams(options.searchParams);
    mockRequest.nextUrl.searchParams = sp;
  }

  // Mock NextResponse
  let responseData = null;
  let responseStatus = 200;

  const mockResponse = {
    json: (data, init = {}) => {
      responseData = data;
      responseStatus = init?.status || 200;
      return {
        json: () => Promise.resolve(data),
        status: responseStatus,
      };
    },
  };

  try {
    const result = await handler(mockRequest, { params });

    // If handler returns a response object
    if (result && typeof result.json === 'function') {
      responseData = await result.json();
      responseStatus = result.status || 200;
    }

    return {
      status: responseStatus,
      body: responseData,
      ok: responseStatus >= 200 && responseStatus < 300,
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      status: 500,
      body: { success: false, error: error.message },
      ok: false,
    };
  }
}

module.exports = {
  createMockRequest,
  createMockResponse,
  callNextHandler,
};

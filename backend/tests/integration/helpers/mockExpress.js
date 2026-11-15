// backend/tests/integration/helpers/mockExpress.js

/**
 * Creates a mock Express res object that resolves a promise when the response is finished.
 */
export const createMockRes = (onDone) => {
  let statusCode = 200;
  let body = null;
  const headers = {};

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      body = data;
      if (onDone) onDone(null, res);
      return res;
    },
    send(data) {
      body = data;
      if (onDone) onDone(null, res);
      return res;
    },
    end(data) {
      if (data !== undefined) body = data;
      if (onDone) onDone(null, res);
      return res;
    },
    setHeader(name, val) {
      headers[name.toLowerCase()] = val;
      return res;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    getStatusCode() {
      return statusCode;
    },
    getBody() {
      return body;
    },
    getData() {
      return body?.data !== undefined ? body.data : body;
    }
  };
  return res;
};

/**
 * Invokes an Express middleware or controller function and returns the populated response.
 * Safely handles asyncHandler wrappers, synchronicity, and next(err) invocations.
 */
export const invokeHandler = (handler, req = {}) => {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (err, res) => {
      if (finished) return;
      finished = true;
      if (err) reject(err);
      else resolve(res);
    };

    const res = createMockRes(finish);
    const next = (err) => {
      if (err) finish(err);
      else finish(null, res);
    };

    // Ensure standard Express req defaults
    req.params = req.params || {};
    req.query = req.query || {};
    req.body = req.body || {};
    req.user = { id: 'bf9a3abe-33d5-41ac-8cb6-110f112a840f', role: 'OWNER', name: 'Integration Tester', ...(req.user || {}) };
    if (!req.user.id || req.user.id.startsWith('test-')) {
      req.user.id = 'bf9a3abe-33d5-41ac-8cb6-110f112a840f';
    }
    req.tenant = req.tenant || req.headers?.['x-tenant'] || req.headers?.['x-tenant-id'] || req.query?.tenant || 'aquasphere';
    req.headers['x-tenant'] = req.tenant;
    req.headers['x-tenant-id'] = req.tenant;

    try {
      const result = handler(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(finish);
      }
    } catch (err) {
      finish(err);
    }
  });
};

export function getBearerToken(request) {
  const headers = request.headers;
  let authHeader = '';

  if (typeof headers.get === 'function') {
    authHeader = headers.get('authorization') || headers.get('Authorization') || '';
  } else if (headers) {
    authHeader = headers['authorization'] || headers['Authorization'] || '';
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function isAuthorized(request) {
  const token = getBearerToken(request);
  const adminPassword = process.env.ADMIN_PASSWORD;
  return token && adminPassword && token === adminPassword;
}

export function unauthorizedResponse() {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}
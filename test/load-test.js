import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(99)<100'],
  },
};

export function setup() {
  const loginRes = http.post(
    `${__ENV.BASE_URL || 'http://localhost:5800'}/api/v1/auth/sign-in`,
    JSON.stringify({
      email: __ENV.USER_EMAIL,
      password: __ENV.USER_PASSWORD,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(loginRes, { 'login status 200': (r) => r.status === 200 });
  const token = loginRes.json().token;
  return { token };
}

export default function (data) {
  const { token } = data;
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const response = http.get(
    `${__ENV.BASE_URL || 'http://localhost:5800'}/api/v1/client/availability/search?serviceId=${
      __ENV.SERVICE_ID || 'default-service-id'
    }&startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
}

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get('http://localhost:5000/health');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body has status=ok': (r) => {
      try {
        const body = r.json();
        return body && body.status === 'ok';
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}

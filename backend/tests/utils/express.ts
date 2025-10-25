import type { Request, Response } from 'express';

export function createMockReq(
  overrides?: Partial<Request> & { user?: any },
): Request {
  const base = {
    params: {},
    query: {},
    body: {},
  } as unknown as Request;
  return Object.assign(base, overrides);
}

export function createMockRes(): Response & {
  json: jest.Mock;
  status: jest.Mock;
  send: jest.Mock;
} {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response & {
    json: jest.Mock;
    status: jest.Mock;
    send: jest.Mock;
  };
  return res;
}

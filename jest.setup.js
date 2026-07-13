import '@testing-library/jest-dom'

Element.prototype.scrollIntoView = jest.fn()

Object.defineProperty(global, 'Request', {
  writable: true,
  value: class MockRequest {
    constructor(url, init) {
      this._url = url
      this.method = init?.method || 'GET'
      this.body = init?.body
      this.headers = new Headers(init?.headers)
    }
    get url() {
      return this._url
    }
    async json() {
      return JSON.parse(this.body)
    }
  },
})

Object.defineProperty(global, 'Response', {
  writable: true,
  value: class MockResponse {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.headers = new Headers(init.headers)
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
    static json(data, init = {}) {
      return new MockResponse(JSON.stringify(data), init)
    }
  },
})

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
)

jest.mock('axios', () => {
  const mockGet = jest.fn();
  mockGet.mockResolvedValue({
    data: {
      response: {
        body: {
          items: {
            item: [
              {
                entrpsNm: '테스트 기업',
                rprsntvNm: '홍길동',
                trdStateNm: '영업중',
                sttDt: '20200101',
                tfdt: '',
                adres: '서울시 강남구',
              }
            ]
          }
        }
      }
    }
  });
  return {
    __esModule: true,
    default: {
      get: mockGet,
      isAxiosError: jest.fn(() => false),
    },
    get: mockGet,
    isAxiosError: jest.fn(() => false),
  };
});

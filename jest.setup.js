import '@testing-library/jest-dom'

// Mock Web APIs for Next.js API routes
Object.defineProperty(global, 'Request', {
  writable: true,
  value: class MockRequest {
    constructor(url) {
      this.url = url
    }
  },
})

Object.defineProperty(global, 'Response', {
  writable: true,
  value: class MockResponse {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.headers = new Map()
    }
    
    json() {
      return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
    }
  },
})

Object.defineProperty(global, 'URL', {
  writable: true,
  value: class MockURL {
    constructor(url) {
      this.url = url
      const [baseUrl, queryString] = url.split('?')
      this.searchParams = new Map()
      
      if (queryString) {
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=')
          this.searchParams.set(key, decodeURIComponent(value || ''))
        })
      }
    }
  },
})

// @ts-ignore
global.describe = jest.requireActual('jest').describe
global.it = jest.requireActual('jest').it
global.expect = jest.requireActual('jest').expect
global.beforeEach = jest.requireActual('jest').beforeEach
global.afterEach = jest.requireActual('jest').afterEach
global.jest = jest.requireActual('jest')
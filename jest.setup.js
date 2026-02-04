import '@testing-library/jest-dom'

// @ts-ignore
global.describe = jest.requireActual('jest').describe
global.it = jest.requireActual('jest').it
global.expect = jest.requireActual('jest').expect
global.beforeEach = jest.requireActual('jest').beforeEach
global.afterEach = jest.requireActual('jest').afterEach
global.jest = jest.requireActual('jest')
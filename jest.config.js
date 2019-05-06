module.exports = {
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx'],
  moduleNameMapper: {
    'src/(.*)': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/'],
  preset: 'ts-jest',
  testMatch: null,
};

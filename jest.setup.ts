import '@testing-library/jest-dom';
import { resetMockData } from '@/mocks/data';

// Each test starts from the seeded mock store — createAddress() and friends
// mutate a shared module-level array, so without this reset writes from one
// test leak into the next (e.g. a created address tripping another test's
// proximity check).
beforeEach(() => {
  resetMockData();
});

process.env.NEXT_PUBLIC_USE_MOCK = 'true';
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'adressebj';

// jsdom doesn't implement these — components that use them for image
// previews would otherwise throw at runtime.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = (() => 'blob:mock-url') as typeof URL.createObjectURL;
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
}

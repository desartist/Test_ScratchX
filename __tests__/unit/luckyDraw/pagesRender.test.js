// The repo's .babelrc uses Babel's classic JSX runtime, so a file with JSX that does not
// `import React` throws "React is not defined" at render time. Lint and unit tests of the
// helpers cannot see that, so this server-renders every Lucky Draw page once.
jest.mock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: true }));
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '64b0c0c0c0c0c0c0c0c0c0c0', campaignId: '64b0c0c0c0c0c0c0c0c0c0c0' }),
  useRouter: () => ({ push: jest.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
jest.mock('next/link', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children),
  };
});
// Jest has no CSS transform in this repo: every class name just echoes its key.
jest.mock('@/app/(dashboard)/lucky-draws/luckyDraws.module.css', () => new Proxy({}, { get: (_target, key) => String(key) }));
jest.mock('@/app/(client)/lucky-draw/[campaignId]/page.module.css', () => new Proxy({}, { get: (_target, key) => String(key) }));

const React = require('react');
const { renderToString } = require('react-dom/server');

const pages = [
  ['merchant list', '@/app/(dashboard)/lucky-draws/page', 'Loading'],
  ['new campaign form', '@/app/(dashboard)/lucky-draws/new/page', 'New Lucky Draw'],
  ['campaign detail', '@/app/(dashboard)/lucky-draws/[id]/page', 'Loading'],
  ['redeem', '@/app/(dashboard)/lucky-draws/redeem/page', 'Redeem a Lucky Draw prize'],
  ['customer entry', '@/app/(client)/lucky-draw/[campaignId]/page', 'Loading'],
];

describe('Lucky Draw pages', () => {
  it.each(pages)('server-renders the %s page without throwing', (_name, modulePath, expectedText) => {
    const Page = require(modulePath).default;
    expect(renderToString(React.createElement(Page))).toContain(expectedText);
  });

  it('answers not-found instead of rendering while the flag is off', () => {
    jest.resetModules();
    jest.doMock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: false }));
    const FreshReact = require('react');
    const { renderToString: render } = require('react-dom/server');
    const Page = require('@/app/(dashboard)/lucky-draws/page').default;

    expect(() => render(FreshReact.createElement(Page))).toThrow('NEXT_NOT_FOUND');
  });
});

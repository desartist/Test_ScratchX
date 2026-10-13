import { focusFirstError } from '@/components/luckyDraw/focusFirstError';

describe('focusFirstError', () => {
  afterEach(() => {
    delete global.document;
  });

  it('scrolls the first field with an error to the middle of the screen and focuses it', () => {
    const el = { scrollIntoView: jest.fn(), focus: jest.fn() };
    global.document = { getElementById: jest.fn(() => el) };

    focusFirstError({ name: 'Enter a name for the draw.', endDate: 'Pick when entries close.' });

    expect(document.getElementById).toHaveBeenCalledWith('ld-name');
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(el.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('uses the id function it is given, and does nothing without errors or a matching element', () => {
    global.document = { getElementById: jest.fn(() => null) };
    focusFirstError({ billAmount: 'x' }, (key) => `ld-entry-${key}`);
    expect(document.getElementById).toHaveBeenCalledWith('ld-entry-billAmount');
    document.getElementById.mockClear();
    focusFirstError({});
    expect(document.getElementById).not.toHaveBeenCalled();
  });
});

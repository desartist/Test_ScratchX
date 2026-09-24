import {
  nextOccurrence,
  initialDrawDate,
  nextDrawDateAfterRun,
} from '@/lib/services/luckyDraw/schedule';

// 2026-09-23 is a Wednesday. 18:00 IST is 12:30 UTC.
describe('nextOccurrence', () => {
  it('returns today at the given IST time when it is still ahead (daily)', () => {
    const after = new Date('2026-09-23T10:00:00Z'); // 15:30 IST
    expect(nextOccurrence(after, { frequency: 'daily', time: '18:00' }).toISOString()).toBe(
      '2026-09-23T12:30:00.000Z',
    );
  });

  it('rolls to tomorrow when today\'s time has passed (daily)', () => {
    const after = new Date('2026-09-23T13:00:00Z'); // 18:30 IST
    expect(nextOccurrence(after, { frequency: 'daily', time: '18:00' }).toISOString()).toBe(
      '2026-09-24T12:30:00.000Z',
    );
  });

  it('is strictly after the reference instant', () => {
    const after = new Date('2026-09-23T12:30:00Z'); // exactly 18:00 IST
    expect(nextOccurrence(after, { frequency: 'daily', time: '18:00' }).toISOString()).toBe(
      '2026-09-24T12:30:00.000Z',
    );
  });

  it('finds the next matching weekday (weekly, Monday = 1)', () => {
    const after = new Date('2026-09-23T10:00:00Z'); // Wednesday
    expect(
      nextOccurrence(after, { frequency: 'weekly', time: '18:00', dayOfWeek: 1 }).toISOString(),
    ).toBe('2026-09-28T12:30:00.000Z');
  });

  it('moves a full week when the weekday and time have just passed', () => {
    const after = new Date('2026-09-28T12:30:00Z'); // Monday 18:00 IST exactly
    expect(
      nextOccurrence(after, { frequency: 'weekly', time: '18:00', dayOfWeek: 1 }).toISOString(),
    ).toBe('2026-10-05T12:30:00.000Z');
  });

  it('defaults the time to 18:00 IST', () => {
    const after = new Date('2026-09-23T10:00:00Z');
    expect(nextOccurrence(after, { frequency: 'daily' }).toISOString()).toBe(
      '2026-09-23T12:30:00.000Z',
    );
  });
});

describe('initialDrawDate', () => {
  const base = {
    startDate: new Date('2026-09-01T00:00:00Z'),
    endDate: new Date('2026-10-31T18:29:59Z'),
  };

  it('uses the campaign end date for an end_of_campaign draw', () => {
    const campaign = { ...base, drawConfig: { scheduleType: 'end_of_campaign' } };
    expect(initialDrawDate(campaign, new Date('2026-09-23T10:00:00Z'))).toEqual(base.endDate);
  });

  it('uses the next occurrence for a recurring draw', () => {
    const campaign = {
      ...base,
      drawConfig: { scheduleType: 'recurring', recurrence: { frequency: 'daily', time: '18:00' } },
    };
    expect(initialDrawDate(campaign, new Date('2026-09-23T10:00:00Z')).toISOString()).toBe(
      '2026-09-23T12:30:00.000Z',
    );
  });

  it('counts from the start date when the campaign has not started yet', () => {
    const campaign = {
      startDate: new Date('2026-10-05T00:00:00Z'),
      endDate: new Date('2026-10-31T18:29:59Z'),
      drawConfig: { scheduleType: 'recurring', recurrence: { frequency: 'daily', time: '18:00' } },
    };
    expect(initialDrawDate(campaign, new Date('2026-09-23T10:00:00Z')).toISOString()).toBe(
      '2026-10-05T12:30:00.000Z',
    );
  });

  it('never goes past the campaign end date', () => {
    const campaign = {
      startDate: base.startDate,
      endDate: new Date('2026-09-23T11:00:00Z'),
      drawConfig: { scheduleType: 'recurring', recurrence: { frequency: 'daily', time: '18:00' } },
    };
    expect(initialDrawDate(campaign, new Date('2026-09-23T10:00:00Z'))).toEqual(campaign.endDate);
  });
});

describe('nextDrawDateAfterRun', () => {
  const recurring = {
    startDate: new Date('2026-09-01T00:00:00Z'),
    endDate: new Date('2026-09-30T18:29:59Z'),
    drawConfig: { scheduleType: 'recurring', recurrence: { frequency: 'daily', time: '18:00' } },
  };

  it('counts from the moment the draw actually ran', () => {
    expect(nextDrawDateAfterRun(recurring, new Date('2026-09-23T14:00:00Z')).toISOString()).toBe(
      '2026-09-24T12:30:00.000Z',
    );
  });

  it('caps the final draw at the campaign end date', () => {
    const ranAt = new Date('2026-09-30T13:00:00Z');
    expect(nextDrawDateAfterRun(recurring, ranAt)).toEqual(recurring.endDate);
  });

  it('returns null once the campaign end date has been reached', () => {
    expect(nextDrawDateAfterRun(recurring, new Date('2026-09-30T18:30:00Z'))).toBeNull();
  });

  it('returns null for an end_of_campaign draw', () => {
    const single = { ...recurring, drawConfig: { scheduleType: 'end_of_campaign' } };
    expect(nextDrawDateAfterRun(single, new Date('2026-09-23T14:00:00Z'))).toBeNull();
  });
});

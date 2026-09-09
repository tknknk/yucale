import {
  attendanceHalfLineClass,
  attendanceLineClass,
  attendanceRingClass,
  getAttendanceMark,
} from './attendance';

const user = { username: '田中', email: 'tanaka@example.com' };

describe('getAttendanceMark', () => {
  it('should mark a plain name as fully attending', () => {
    expect(getAttendanceMark('S: 田中, 鈴木', user)).toBe('full');
  });

  it('should mark a name suffixed with 遅 as late', () => {
    expect(getAttendanceMark('S: 鈴木, 田中(遅)', user)).toBe('late');
  });

  it('should mark a name suffixed with 早 as leaving early', () => {
    expect(getAttendanceMark('S: 田中(早)\nA: 佐藤', user)).toBe('early-leave');
  });

  it('should treat an unknown suffix as fully attending', () => {
    expect(getAttendanceMark('S: 田中(?)', user)).toBe('full');
  });

  it('should not let another attendee suffix leak onto the user', () => {
    expect(getAttendanceMark('S: 田中, 鈴木(遅)', user)).toBe('full');
  });

  it('should match on the email as well', () => {
    expect(getAttendanceMark('TANAKA@EXAMPLE.COM(遅)', user)).toBe('late');
  });

  it('should return null when the user is not listed', () => {
    expect(getAttendanceMark('S: 鈴木, 佐藤', user)).toBeNull();
  });

  it('should return null without attendees or user', () => {
    expect(getAttendanceMark(undefined, user)).toBeNull();
    expect(getAttendanceMark('', user)).toBeNull();
    expect(getAttendanceMark('S: 田中', null)).toBeNull();
  });
});

describe('attendanceLineClass', () => {
  it('should draw a full-height border for an attendee', () => {
    expect(attendanceLineClass('full', {})).toBe('border-l-4 border-l-blue-500');
  });

  it('should leave the border transparent for a half line, keeping the text in place', () => {
    // 半分のラインは重ねる枠が描くので、本体は位置決めと幅の確保だけ
    expect(attendanceLineClass('early-leave', {})).toBe(
      'relative border-l-4 border-l-transparent'
    );
    expect(attendanceLineClass('late', {})).toBe('relative border-l-4 border-l-transparent');
  });

  it('should use the card colour of past and all-day schedules', () => {
    expect(attendanceLineClass('full', { isPast: true })).toContain('border-l-gray-400');
    expect(attendanceLineClass('full', { allDay: true })).toContain('border-l-rose-500');
  });

  it('should draw nothing when the user is not attending', () => {
    expect(attendanceLineClass(null, {})).toBe('');
  });
});

describe('attendanceRingClass', () => {
  it('should ring the whole card for an attendee', () => {
    expect(attendanceRingClass('full', {})).toBe('ring-4 ring-blue-500');
  });

  it('should keep a thin ring all round for a half line, so only half reads as thick', () => {
    expect(attendanceRingClass('early-leave', {})).toBe('relative ring-2 ring-blue-500');
    expect(attendanceRingClass('late', {})).toBe('relative ring-2 ring-blue-500');
  });

  it('should use the card colour of past and all-day schedules', () => {
    expect(attendanceRingClass('full', { isPast: true })).toContain('ring-gray-400');
    expect(attendanceRingClass('late', { allDay: true })).toContain('ring-rose-500');
  });

  it('should leave the ring to the caller when the user is not attending', () => {
    expect(attendanceRingClass(null, {})).toBe('');
  });
});

describe('attendanceHalfLineClass', () => {
  it('should clip the overlay to the top half for someone leaving early', () => {
    const className = attendanceHalfLineClass('early-leave', {});
    expect(className).toContain('[clip-path:inset(0_0_50%_0)]');
    expect(className).toContain('border-l-blue-500');
    // カードの border ボックスに重ねるので、角丸と食い込みは同じにする
    expect(className).toContain('rounded-2xl');
    expect(className).toContain('-left-1');
    expect(className).toContain('pointer-events-none');
  });

  it('should clip the overlay to the bottom half for someone arriving late', () => {
    expect(attendanceHalfLineClass('late', {})).toContain('[clip-path:inset(50%_0_0_0)]');
  });

  it('should use the card colour of past and all-day schedules', () => {
    expect(attendanceHalfLineClass('late', { isPast: true })).toContain('border-l-gray-400');
    expect(attendanceHalfLineClass('late', { allDay: true })).toContain('border-l-rose-500');
  });

  it('should overlay the ring band instead of the border when expanded', () => {
    const className = attendanceHalfLineClass('late', { expanded: true });
    // リングと同じ位置（borderボックスの外4px）に全周4pxの枠を重ねる
    expect(className).toContain('-inset-[5px]');
    expect(className).toContain('rounded-[calc(theme(borderRadius.2xl)_+_4px)]');
    expect(className).toContain('border-4 border-blue-500');
    expect(className).toContain('[clip-path:inset(50%_0_0_0)]');
    expect(className).not.toContain('border-l-4');
  });

  it('should draw no overlay for a full line or a non-attendee', () => {
    expect(attendanceHalfLineClass('full', {})).toBe('');
    expect(attendanceHalfLineClass(null, {})).toBe('');
    expect(attendanceHalfLineClass('full', { expanded: true })).toBe('');
  });
});

import { formatRoleName } from './roleLabel';

describe('formatRoleName', () => {
  it('should capitalize each role name', () => {
    expect(formatRoleName('ADMIN')).toBe('Admin');
    expect(formatRoleName('EDITOR')).toBe('Editor');
    expect(formatRoleName('VIEWER')).toBe('Viewer');
  });

  it('should render NO_ROLE as readable text', () => {
    expect(formatRoleName('NO_ROLE')).toBe('No role');
  });

  it('should return an empty string when there is no role', () => {
    expect(formatRoleName(undefined)).toBe('');
    expect(formatRoleName(null)).toBe('');
    expect(formatRoleName('')).toBe('');
  });

  it('should pass through an unknown role rather than dropping it', () => {
    expect(formatRoleName('OWNER')).toBe('OWNER');
  });
});

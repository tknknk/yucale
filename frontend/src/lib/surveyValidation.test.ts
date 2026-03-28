import { validateMandatoryFields } from './surveyValidation';
import { SurveyDetail } from '@/types/survey';

const createMockDetail = (overrides?: Partial<SurveyDetail>): SurveyDetail => ({
  id: 1,
  scheduleId: 101,
  scheduleSummary: 'Test Schedule',
  scheduleDtstart: '2025-01-20T10:00:00',
  scheduleDtend: '2025-01-20T12:00:00',
  mandatory: false,
  ...overrides,
});

describe('validateMandatoryFields', () => {
  describe('when mandatory field is not answered', () => {
    it('should return invalid with error message', () => {
      const details = [
        createMockDetail({ id: 1, scheduleSummary: 'Mandatory Schedule', mandatory: true }),
      ];
      const responses = {
        '1': { responseOption: '', freeText: '' },
      };

      const result = validateMandatoryFields(details, responses);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('必須項目が未回答です: Mandatory Schedule');
      expect(result.unansweredMandatoryFields).toHaveLength(1);
    });

    it('should list multiple unanswered mandatory fields', () => {
      const details = [
        createMockDetail({ id: 1, scheduleSummary: 'Mandatory 1', mandatory: true }),
        createMockDetail({ id: 2, scheduleSummary: 'Mandatory 2', mandatory: true }),
      ];
      const responses = {
        '1': { responseOption: '', freeText: '' },
        '2': { responseOption: '', freeText: '' },
      };

      const result = validateMandatoryFields(details, responses);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('必須項目が未回答です: Mandatory 1、Mandatory 2');
      expect(result.unansweredMandatoryFields).toHaveLength(2);
    });

    it('should return invalid when mandatory field response is missing from responses object', () => {
      const details = [
        createMockDetail({ id: 1, scheduleSummary: 'Mandatory Schedule', mandatory: true }),
      ];
      const responses = {};

      const result = validateMandatoryFields(details, responses);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('必須項目が未回答です');
    });
  });

  describe('when mandatory field is answered', () => {
    it('should return valid', () => {
      const details = [
        createMockDetail({ id: 1, scheduleSummary: 'Mandatory Schedule', mandatory: true }),
      ];
      const responses = {
        '1': { responseOption: '出席', freeText: '' },
      };

      const result = validateMandatoryFields(details, responses);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
      expect(result.unansweredMandatoryFields).toHaveLength(0);
    });
  });

  describe('when only optional fields are not answered', () => {
    it('should return valid', () => {
      const details = [
        createMockDetail({ id: 1, scheduleSummary: 'Optional Schedule', mandatory: false }),
        createMockDetail({ id: 2, scheduleSummary: 'Mandatory Schedule', mandatory: true }),
      ];
      const responses = {
        '1': { responseOption: '', freeText: '' }, // Optional not answered
        '2': { responseOption: '出席', freeText: '' }, // Mandatory answered
      };

      const result = validateMandatoryFields(details, responses);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('when survey has no details', () => {
    it('should return valid for undefined details', () => {
      const result = validateMandatoryFields(undefined, {});

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    it('should return valid for empty details array', () => {
      const result = validateMandatoryFields([], {});

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('when survey has no mandatory fields', () => {
    it('should return valid even when no responses are provided', () => {
      const details = [
        createMockDetail({ id: 1, scheduleSummary: 'Optional 1', mandatory: false }),
        createMockDetail({ id: 2, scheduleSummary: 'Optional 2', mandatory: false }),
      ];
      const responses = {};

      const result = validateMandatoryFields(details, responses);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('mixed mandatory and optional fields', () => {
    it('should only report unanswered mandatory fields', () => {
      const details = [
        createMockDetail({ id: 1, scheduleSummary: 'Optional', mandatory: false }),
        createMockDetail({ id: 2, scheduleSummary: 'Mandatory Answered', mandatory: true }),
        createMockDetail({ id: 3, scheduleSummary: 'Mandatory Unanswered', mandatory: true }),
      ];
      const responses = {
        '1': { responseOption: '', freeText: '' },
        '2': { responseOption: '出席', freeText: '' },
        '3': { responseOption: '', freeText: '' },
      };

      const result = validateMandatoryFields(details, responses);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('必須項目が未回答です: Mandatory Unanswered');
      expect(result.unansweredMandatoryFields).toHaveLength(1);
      expect(result.unansweredMandatoryFields[0].scheduleSummary).toBe('Mandatory Unanswered');
    });
  });
});

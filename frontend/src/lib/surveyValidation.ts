import { SurveyDetail } from '@/types/survey';

interface ResponseData {
  [detailId: string]: {
    responseOption: string;
    freeText: string;
  };
}

export interface MandatoryValidationResult {
  isValid: boolean;
  unansweredMandatoryFields: SurveyDetail[];
  errorMessage: string | null;
}

/**
 * Validates that all mandatory survey fields have been answered
 */
export function validateMandatoryFields(
  details: SurveyDetail[] | undefined,
  responses: ResponseData
): MandatoryValidationResult {
  if (!details) {
    return { isValid: true, unansweredMandatoryFields: [], errorMessage: null };
  }

  const mandatoryDetails = details.filter((d) => d.mandatory);
  const unansweredMandatory = mandatoryDetails.filter((detail) => {
    const response = responses[detail.id.toString()];
    return !response?.responseOption;
  });

  if (unansweredMandatory.length > 0) {
    const names = unansweredMandatory.map((d) => d.scheduleSummary).join('、');
    return {
      isValid: false,
      unansweredMandatoryFields: unansweredMandatory,
      errorMessage: `必須項目が未回答です: ${names}`,
    };
  }

  return { isValid: true, unansweredMandatoryFields: [], errorMessage: null };
}

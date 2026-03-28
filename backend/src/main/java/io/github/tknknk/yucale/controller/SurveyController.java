package io.github.tknknk.yucale.controller;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import io.github.tknknk.yucale.dto.*;
import io.github.tknknk.yucale.service.SurveyService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
@Slf4j
public class SurveyController {

    private final SurveyService surveyService;

    /**
     * GET /api/surveys/defaults - Get default survey settings (public)
     */
    @GetMapping("/defaults")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDefaults() {
        Map<String, Object> defaults = surveyService.getDefaults();
        return ResponseEntity.ok(ApiResponse.success(defaults));
    }

    /**
     * GET /api/surveys/schedule-ids-with-surveys - Get schedule IDs that already have surveys (EDITOR, ADMIN)
     */
    @GetMapping("/schedule-ids-with-surveys")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Long>>> getScheduleIdsWithSurveys() {
        List<Long> scheduleIds = surveyService.getScheduleIdsWithSurveys();
        return ResponseEntity.ok(ApiResponse.success(scheduleIds));
    }

    /**
     * GET /api/surveys - Get all surveys (requires authentication)
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SurveyDto>>> getAllSurveys() {
        List<SurveyDto> surveys = surveyService.getAllSurveys();
        return ResponseEntity.ok(ApiResponse.success(surveys));
    }

    /**
     * GET /api/surveys/{urlId} - Get survey by URL ID (public)
     */
    @GetMapping("/{urlId}")
    public ResponseEntity<ApiResponse<SurveyDto>> getSurveyByUrlId(@PathVariable String urlId) {
        try {
            SurveyDto survey = surveyService.getSurveyByUrlId(urlId);
            return ResponseEntity.ok(ApiResponse.success(survey));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/surveys/{urlId}/results - Get survey with results (EDITOR, ADMIN)
     */
    @GetMapping("/{urlId}/results")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<SurveyDto>> getSurveyWithResults(@PathVariable String urlId) {
        try {
            SurveyDto survey = surveyService.getSurveyWithResults(urlId);
            return ResponseEntity.ok(ApiResponse.success(survey));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/surveys/{urlId}/my-responses - Get my responses (requires authentication)
     */
    @GetMapping("/{urlId}/my-responses")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SurveyResponseDto>>> getMyResponses(@PathVariable String urlId) {
        try {
            List<SurveyResponseDto> responses = surveyService.getMyResponses(urlId);
            return ResponseEntity.ok(ApiResponse.success(responses));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * POST /api/surveys - Create a new survey (EDITOR, ADMIN)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<SurveyDto>> createSurvey(@Valid @RequestBody CreateSurveyRequest request) {
        try {
            SurveyDto created = surveyService.createSurvey(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("アンケートを作成しました", created));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/surveys/{id} - Update a survey (EDITOR, ADMIN)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<SurveyDto>> updateSurvey(
            @PathVariable Long id,
            @Valid @RequestBody CreateSurveyRequest request) {
        try {
            SurveyDto updated = surveyService.updateSurvey(id, request);
            return ResponseEntity.ok(ApiResponse.success("アンケートを更新しました", updated));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * DELETE /api/surveys/{id} - Delete a survey (EDITOR, ADMIN)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSurvey(@PathVariable Long id) {
        try {
            surveyService.deleteSurvey(id);
            return ResponseEntity.ok(ApiResponse.success("アンケートを削除しました", null));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * POST /api/surveys/{urlId}/responses - Submit survey responses (public)
     */
    @PostMapping("/{urlId}/responses")
    public ResponseEntity<ApiResponse<List<SurveyResponseDto>>> submitResponses(
            @PathVariable String urlId,
            @Valid @RequestBody SubmitSurveyResponseRequest request) {
        try {
            List<SurveyResponseDto> responses = surveyService.submitResponses(urlId, request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("回答を送信しました", responses));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * DELETE /api/surveys/responses/{responseId} - Delete a response (EDITOR, ADMIN)
     */
    @DeleteMapping("/responses/{responseId}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteResponse(@PathVariable Long responseId) {
        try {
            surveyService.deleteResponse(responseId);
            return ResponseEntity.ok(ApiResponse.success("回答を削除しました", null));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * DELETE /api/surveys/{urlId}/responses/{userName} - Delete all responses for a user (EDITOR, ADMIN)
     */
    @DeleteMapping("/{urlId}/responses/{userName}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUserResponses(
            @PathVariable String urlId,
            @PathVariable String userName) {
        try {
            surveyService.deleteUserResponses(urlId, userName);
            return ResponseEntity.ok(ApiResponse.success("ユーザーの回答を削除しました", null));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}

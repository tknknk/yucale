package io.github.tknknk.yucale.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.tknknk.yucale.dto.*;
import io.github.tknknk.yucale.entity.*;
import io.github.tknknk.yucale.repository.*;
import io.github.tknknk.yucale.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class SurveyService {

    private final SurveyRepository surveyRepository;
    private final SurveyDetailRepository surveyDetailRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final ScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.survey.default-belonging-list:S,A,T,B}")
    private String defaultBelongingList;

    @Value("${app.survey.default-response-options:出席,欠席,未定}")
    private String defaultResponseOptions;

    @Value("${app.survey.default-attending-options:出席}")
    private String defaultAttendingOptions;

    /**
     * Get default survey settings
     */
    public Map<String, Object> getDefaults() {
        Map<String, Object> defaults = new HashMap<>();
        defaults.put("belongingList", parseCommaSeparated(defaultBelongingList));

        // Build response options with isAttending flag
        List<String> responseOptionsList = parseCommaSeparated(defaultResponseOptions);
        Set<String> attendingOptions = new HashSet<>(parseCommaSeparated(defaultAttendingOptions));
        List<ResponseOptionDto> responseOptions = responseOptionsList.stream()
                .map(option -> ResponseOptionDto.builder()
                        .option(option)
                        .isAttending(attendingOptions.contains(option))
                        .build())
                .collect(Collectors.toList());
        defaults.put("responseOptions", responseOptions);

        return defaults;
    }

    /**
     * Get schedule IDs that already have surveys (requires EDITOR or ADMIN)
     */
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public List<Long> getScheduleIdsWithSurveys() {
        return surveyDetailRepository.findAllScheduleIdsWithSurveys();
    }

    /**
     * Get all surveys (requires authentication)
     */
    @PreAuthorize("isAuthenticated()")
    public List<SurveyDto> getAllSurveys() {
        String currentUsername = getCurrentUsername();
        Set<Long> respondedSurveyIds = new HashSet<>(
                surveyResponseRepository.findRespondedSurveyIdsByUserName(currentUsername)
        );

        return surveyRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(survey -> {
                    SurveyDto dto = toDto(survey);
                    dto.setHasResponded(respondedSurveyIds.contains(survey.getId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get survey by URL ID (public access)
     */
    public SurveyDto getSurveyByUrlId(String urlId) {
        Survey survey = surveyRepository.findByUrlIdWithDetails(urlId)
                .orElseThrow(() -> new EntityNotFoundException("アンケートが見つかりません"));
        return toDtoWithDetails(survey);
    }

    /**
     * Get survey with results (requires EDITOR or ADMIN)
     */
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public SurveyDto getSurveyWithResults(String urlId) {
        Survey survey = surveyRepository.findByUrlIdWithDetailsAndResponses(urlId)
                .orElseThrow(() -> new EntityNotFoundException("アンケートが見つかりません"));
        return toDtoWithDetailsAndResponses(survey);
    }

    /**
     * Create a new survey (requires EDITOR or ADMIN)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public SurveyDto createSurvey(CreateSurveyRequest request) {
        User currentUser = getCurrentUser();

        Survey survey = Survey.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .belongingList(joinList(request.getBelongingList()))
                .responseOptions(responseOptionsToJson(request.getResponseOptions()))
                .enableFreetext(request.getEnableFreetext() != null ? request.getEnableFreetext() : true)
                .deadlineAt(request.getDeadlineAt())
                .softDue(request.getSoftDue())
                .createdBy(currentUser)
                .build();

        Survey saved = surveyRepository.save(survey);

        // Add survey details
        for (CreateSurveyRequest.SurveyDetailRequest detailRequest : request.getDetails()) {
            Schedule schedule = scheduleRepository.findById(detailRequest.getScheduleId())
                    .orElseThrow(() -> new EntityNotFoundException("スケジュールが見つかりません"));

            SurveyDetail detail = SurveyDetail.builder()
                    .survey(saved)
                    .schedule(schedule)
                    .mandatory(detailRequest.getMandatory() != null ? detailRequest.getMandatory() : false)
                    .build();

            surveyDetailRepository.save(detail);
        }

        return toDtoWithDetails(surveyRepository.findByUrlIdWithDetails(saved.getUrlId()).orElse(saved));
    }

    /**
     * Update a survey (requires EDITOR or ADMIN)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public SurveyDto updateSurvey(Long id, CreateSurveyRequest request) {
        Survey survey = surveyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("アンケートが見つかりません"));

        // Get old schedule IDs before deleting details
        List<Long> oldScheduleIds = surveyDetailRepository.findBySurveyId(id).stream()
                .map(d -> d.getSchedule().getId())
                .collect(Collectors.toList());

        survey.setTitle(request.getTitle());
        survey.setDescription(request.getDescription());
        survey.setBelongingList(joinList(request.getBelongingList()));
        survey.setResponseOptions(responseOptionsToJson(request.getResponseOptions()));
        survey.setEnableFreetext(request.getEnableFreetext() != null ? request.getEnableFreetext() : true);
        survey.setDeadlineAt(request.getDeadlineAt());
        survey.setSoftDue(request.getSoftDue());

        // Remove existing details and add new ones
        surveyDetailRepository.deleteBySurveyId(id);

        Set<Long> newScheduleIds = new HashSet<>();
        for (CreateSurveyRequest.SurveyDetailRequest detailRequest : request.getDetails()) {
            Schedule schedule = scheduleRepository.findById(detailRequest.getScheduleId())
                    .orElseThrow(() -> new EntityNotFoundException("スケジュールが見つかりません"));

            SurveyDetail detail = SurveyDetail.builder()
                    .survey(survey)
                    .schedule(schedule)
                    .mandatory(detailRequest.getMandatory() != null ? detailRequest.getMandatory() : false)
                    .build();

            surveyDetailRepository.save(detail);
            newScheduleIds.add(detailRequest.getScheduleId());
        }

        // Clear attendees for schedules that were removed from the survey
        for (Long scheduleId : oldScheduleIds) {
            if (!newScheduleIds.contains(scheduleId)) {
                scheduleRepository.updateAttendees(scheduleId, null);
            }
        }

        // Update attendees for all schedules in this survey (responses were deleted, so this will recalculate)
        Survey updated = surveyRepository.save(survey);
        Survey surveyWithDetails = surveyRepository.findByUrlIdWithDetails(updated.getUrlId()).orElse(updated);
        updateScheduleAttendees(surveyWithDetails);

        return toDtoWithDetails(surveyWithDetails);
    }

    /**
     * Delete a survey (requires EDITOR or ADMIN)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public void deleteSurvey(Long id) {
        Survey survey = surveyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("アンケートが見つかりません"));

        // Clear attendees for all schedules linked to this survey before deleting
        List<SurveyDetail> details = surveyDetailRepository.findBySurveyId(id);
        for (SurveyDetail detail : details) {
            Schedule schedule = detail.getSchedule();
            if (schedule != null) {
                scheduleRepository.updateAttendees(schedule.getId(), null);
            }
        }

        surveyRepository.deleteById(id);
    }

    /**
     * Submit survey responses (public access)
     */
    @Transactional
    public List<SurveyResponseDto> submitResponses(String urlId, SubmitSurveyResponseRequest request) {
        Survey survey = surveyRepository.findByUrlId(urlId)
                .orElseThrow(() -> new EntityNotFoundException("アンケートが見つかりません"));

        // Check deadline (skip if softDue is true)
        if (survey.getDeadlineAt() != null && LocalDateTime.now().isAfter(survey.getDeadlineAt())) {
            if (!Boolean.TRUE.equals(survey.getSoftDue())) {
                throw new IllegalStateException("回答期限を過ぎています");
            }
        }

        // Check belonging is required if belongingList is configured
        if (survey.getBelongingList() != null && !survey.getBelongingList().isBlank()) {
            if (request.getBelonging() == null || request.getBelonging().isBlank()) {
                throw new IllegalArgumentException("所属は必須です");
            }
        }

        // Check if user is authenticated
        boolean isAuthenticated = isUserAuthenticated();
        String currentUsername = getCurrentUsername();

        // 非ログイン状態の場合のチェック
        if (!isAuthenticated) {
            // usersテーブルに存在するユーザー名では回答できない
            if (userRepository.existsByUsername(request.getUserName())) {
                throw new IllegalArgumentException("このユーザー名は既に登録されています。ログインして回答してください。");
            }

            // 既に回答済みのユーザー名では回答できない
            List<SurveyResponse> existingResponses = surveyResponseRepository.findByUrlIdAndUserName(urlId, request.getUserName());
            if (!existingResponses.isEmpty()) {
                throw new IllegalArgumentException("このユーザー名では既に回答済みです。回答を編集するにはログインしてください。");
            }
        } else {
            // ログイン状態の場合、自分のユーザー名でのみ回答可能
            if (!request.getUserName().equals(currentUsername)) {
                throw new IllegalArgumentException("ログイン中は自分のユーザー名でのみ回答できます。");
            }
        }

        // Get all survey details to check mandatory fields
        List<SurveyDetail> allDetails = surveyDetailRepository.findBySurveyId(survey.getId());

        // Build a map of surveyDetailId -> responseOption from request
        Map<Long, String> responseMap = new HashMap<>();
        for (SubmitSurveyResponseRequest.ResponseItem item : request.getResponses()) {
            responseMap.put(item.getSurveyDetailId(), item.getResponseOption());
        }

        // Check mandatory fields
        for (SurveyDetail detail : allDetails) {
            if (Boolean.TRUE.equals(detail.getMandatory())) {
                String responseOption = responseMap.get(detail.getId());
                if (responseOption == null || responseOption.isBlank()) {
                    String scheduleName = detail.getSchedule() != null ? detail.getSchedule().getSummary() : "不明";
                    throw new IllegalArgumentException("必須項目が未回答です: " + scheduleName);
                }
            }
        }

        List<SurveyResponseDto> savedResponses = new ArrayList<>();

        for (SubmitSurveyResponseRequest.ResponseItem item : request.getResponses()) {
            SurveyDetail detail = surveyDetailRepository.findById(item.getSurveyDetailId())
                    .orElseThrow(() -> new EntityNotFoundException("アンケート項目が見つかりません"));

            // Verify the detail belongs to this survey
            if (!detail.getSurvey().getId().equals(survey.getId())) {
                throw new IllegalArgumentException("アンケート項目がこのアンケートに属していません");
            }

            // Check if response already exists - update if it does (only for authenticated users)
            Optional<SurveyResponse> existingResponse = surveyResponseRepository
                    .findBySurveyDetailIdAndUserName(item.getSurveyDetailId(), request.getUserName());

            SurveyResponse response;
            if (existingResponse.isPresent() && isAuthenticated) {
                // ログイン状態の場合のみ既存回答を更新
                response = existingResponse.get();
                response.setBelonging(request.getBelonging());
                response.setResponseOption(item.getResponseOption());
                response.setFreeText(item.getFreeText());
                response.setUpdatedAt(LocalDateTime.now());
            } else {
                response = SurveyResponse.builder()
                        .surveyDetail(detail)
                        .userName(request.getUserName())
                        .belonging(request.getBelonging())
                        .responseOption(item.getResponseOption())
                        .freeText(item.getFreeText())
                        .build();
            }

            SurveyResponse saved = surveyResponseRepository.save(response);
            savedResponses.add(toResponseDto(saved));
        }

        // Update attendees for all schedules in this survey
        updateScheduleAttendees(survey);

        return savedResponses;
    }

    /**
     * Check if current user is authenticated
     */
    private boolean isUserAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails;
    }

    /**
     * Get my responses for a survey (requires authentication)
     */
    @PreAuthorize("isAuthenticated()")
    public List<SurveyResponseDto> getMyResponses(String urlId) {
        String username = getCurrentUsername();
        return surveyResponseRepository.findByUrlIdAndUserName(urlId, username).stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    /**
     * Delete a response (requires EDITOR or ADMIN)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public void deleteResponse(Long responseId) {
        SurveyResponse response = surveyResponseRepository.findById(responseId)
                .orElseThrow(() -> new EntityNotFoundException("回答が見つかりません"));
        Survey survey = response.getSurveyDetail().getSurvey();
        surveyResponseRepository.deleteById(responseId);

        // Update attendees for all schedules in this survey
        updateScheduleAttendees(survey);
    }

    /**
     * Delete all responses for a user in a survey (requires EDITOR or ADMIN)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public void deleteUserResponses(String urlId, String userName) {
        Survey survey = surveyRepository.findByUrlId(urlId)
                .orElseThrow(() -> new EntityNotFoundException("アンケートが見つかりません"));
        // JPQLのDELETE文でネストしたプロパティ参照がうまく動作しないため、
        // 先にIDを取得してから削除する
        List<SurveyResponse> responses = surveyResponseRepository.findByUrlIdAndUserName(urlId, userName);
        surveyResponseRepository.deleteAll(responses);

        // Update attendees for all schedules in this survey
        updateScheduleAttendees(survey);
    }

    /**
     * Update attendees for all schedules linked to a survey
     * Groups attending users by belonging and updates each schedule's attendees field
     */
    private void updateScheduleAttendees(Survey survey) {
        // Get attending options from survey
        List<ResponseOptionDto> responseOptions = parseResponseOptions(survey.getResponseOptions());
        Set<String> attendingOptions = responseOptions.stream()
                .filter(opt -> Boolean.TRUE.equals(opt.getIsAttending()))
                .map(ResponseOptionDto::getOption)
                .collect(Collectors.toSet());

        if (attendingOptions.isEmpty()) {
            return;
        }

        // Get belonging list for ordering
        List<String> belongingOrder = parseCommaSeparated(survey.getBelongingList());

        // Get all survey details with responses
        List<SurveyDetail> details = surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(survey.getId());

        for (SurveyDetail detail : details) {
            Schedule schedule = detail.getSchedule();
            if (schedule == null) continue;

            // Group attending users by belonging
            Map<String, List<String>> attendeesByBelonging = new LinkedHashMap<>();

            // Initialize with belonging order
            for (String belonging : belongingOrder) {
                attendeesByBelonging.put(belonging, new ArrayList<>());
            }

            // Collect attending users
            for (SurveyResponse response : detail.getResponses()) {
                if (response.getResponseOption() != null && attendingOptions.contains(response.getResponseOption())) {
                    String belonging = response.getBelonging() != null ? response.getBelonging() : "";
                    attendeesByBelonging.computeIfAbsent(belonging, k -> new ArrayList<>())
                            .add(response.getUserName());
                }
            }

            // Build attendees string
            StringBuilder sb = new StringBuilder();
            for (Map.Entry<String, List<String>> entry : attendeesByBelonging.entrySet()) {
                List<String> names = entry.getValue();
                if (!names.isEmpty()) {
                    if (sb.length() > 0) {
                        sb.append("\n");
                    }
                    if (!entry.getKey().isEmpty()) {
                        sb.append(entry.getKey()).append(": ");
                    }
                    sb.append(String.join(", ", names));
                }
            }

            // Update schedule attendees without changing updated_at
            String attendeesStr = sb.length() > 0 ? sb.toString() : null;
            scheduleRepository.updateAttendees(schedule.getId(), attendeesStr);
        }
    }

    // Helper methods

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails details = (CustomUserDetails) auth.getPrincipal();
            return userRepository.findById(details.getId())
                    .orElseThrow(() -> new EntityNotFoundException("ユーザーが見つかりません"));
        }
        throw new IllegalStateException("認証されたユーザーが見つかりません");
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUsername();
        }
        return null;
    }

    private List<String> parseCommaSeparated(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private String joinList(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        return String.join(",", list);
    }

    private String responseOptionsToJson(List<ResponseOptionDto> options) {
        if (options == null || options.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(options);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize response options to JSON", e);
            return null;
        }
    }

    private List<ResponseOptionDto> parseResponseOptions(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<ResponseOptionDto>>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to parse response options JSON", e);
            return List.of();
        }
    }

    private SurveyDto toDto(Survey survey) {
        return SurveyDto.builder()
                .id(survey.getId())
                .urlId(survey.getUrlId())
                .title(survey.getTitle())
                .description(survey.getDescription())
                .belongingList(parseCommaSeparated(survey.getBelongingList()))
                .responseOptions(parseResponseOptions(survey.getResponseOptions()))
                .enableFreetext(survey.getEnableFreetext())
                .deadlineAt(survey.getDeadlineAt())
                .softDue(survey.getSoftDue())
                .createdByUsername(survey.getCreatedBy() != null ? survey.getCreatedBy().getUsername() : null)
                .createdAt(survey.getCreatedAt())
                .updatedAt(survey.getUpdatedAt())
                .build();
    }

    private SurveyDto toDtoWithDetails(Survey survey) {
        SurveyDto dto = toDto(survey);
        dto.setDetails(survey.getDetails().stream()
                .map(this::toDetailDto)
                .collect(Collectors.toList()));
        return dto;
    }

    private SurveyDto toDtoWithDetailsAndResponses(Survey survey) {
        SurveyDto dto = toDto(survey);
        dto.setDetails(survey.getDetails().stream()
                .map(this::toDetailDtoWithResponses)
                .collect(Collectors.toList()));
        return dto;
    }

    private SurveyDetailDto toDetailDto(SurveyDetail detail) {
        Schedule schedule = detail.getSchedule();
        return SurveyDetailDto.builder()
                .id(detail.getId())
                .scheduleId(schedule != null ? schedule.getId() : null)
                .scheduleSummary(schedule != null ? schedule.getSummary() : null)
                .scheduleDtstart(schedule != null ? schedule.getDtstart() : null)
                .scheduleDtend(schedule != null ? schedule.getDtend() : null)
                .mandatory(detail.getMandatory())
                .build();
    }

    private SurveyDetailDto toDetailDtoWithResponses(SurveyDetail detail) {
        SurveyDetailDto dto = toDetailDto(detail);
        dto.setResponses(detail.getResponses().stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList()));
        return dto;
    }

    private SurveyResponseDto toResponseDto(SurveyResponse response) {
        return SurveyResponseDto.builder()
                .id(response.getId())
                .surveyDetailId(response.getSurveyDetail() != null ? response.getSurveyDetail().getId() : null)
                .userName(response.getUserName())
                .belonging(response.getBelonging())
                .responseOption(response.getResponseOption())
                .freeText(response.getFreeText())
                .createdAt(response.getCreatedAt())
                .updatedAt(response.getUpdatedAt())
                .build();
    }
}

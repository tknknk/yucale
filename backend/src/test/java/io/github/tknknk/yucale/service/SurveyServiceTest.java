package io.github.tknknk.yucale.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.tknknk.yucale.dto.*;
import io.github.tknknk.yucale.entity.*;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.repository.*;
import io.github.tknknk.yucale.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * SurveyServiceのユニットテスト
 * 出欠調査機能の作成、取得、回答、削除をテスト
 */
@ExtendWith(MockitoExtension.class)
class SurveyServiceTest {

    @Mock
    private SurveyRepository surveyRepository;

    @Mock
    private SurveyDetailRepository surveyDetailRepository;

    @Mock
    private SurveyResponseRepository surveyResponseRepository;

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private UserRepository userRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private SurveyService surveyService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    private User testUser;
    private Survey testSurvey;
    private Schedule testSchedule;
    private SurveyDetail testDetail;
    private CustomUserDetails testUserDetails;

    @BeforeEach
    void setUp() {
        // デフォルト設定値を注入
        ReflectionTestUtils.setField(surveyService, "defaultBelongingList", "S,A,T,B");
        ReflectionTestUtils.setField(surveyService, "defaultResponseOptions", "出席,欠席,未定");
        ReflectionTestUtils.setField(surveyService, "defaultAttendingOptions", "出席");

        // テストユーザーの初期化
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .role(Role.EDITOR)
                .build();

        testUserDetails = new CustomUserDetails(testUser);

        // テストスケジュールの初期化
        testSchedule = Schedule.builder()
                .id(1L)
                .urlId("sched001")
                .summary("Test Schedule")
                .dtstart(LocalDateTime.now().plusDays(7))
                .dtend(LocalDateTime.now().plusDays(7).plusHours(2))
                .build();

        // テスト出欠調査の初期化
        testSurvey = Survey.builder()
                .id(1L)
                .urlId("surv001")
                .title("Test Survey")
                .description("Test Description")
                .belongingList("S,A,T,B")
                .responseOptions("[{\"option\":\"出席\",\"isAttending\":true},{\"option\":\"欠席\",\"isAttending\":false}]")
                .enableFreetext(true)
                .createdBy(testUser)
                .details(new HashSet<>())
                .createdAt(LocalDateTime.now())
                .build();

        // テスト詳細の初期化
        testDetail = SurveyDetail.builder()
                .id(1L)
                .survey(testSurvey)
                .schedule(testSchedule)
                .mandatory(false)
                .responses(new HashSet<>())
                .build();
    }

    private void setupSecurityContext() {
        SecurityContextHolder.setContext(securityContext);
        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn(testUserDetails);
    }

    private void setupAnonymousContext() {
        SecurityContextHolder.setContext(securityContext);
        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn("anonymousUser");
    }

    @Nested
    @DisplayName("getDefaults - デフォルト設定の取得")
    class GetDefaultsTests {

        @Test
        @DisplayName("デフォルトの所属リストと回答オプションを取得")
        void shouldReturnDefaultSettings() {
            // 実行
            Map<String, Object> defaults = surveyService.getDefaults();

            // 検証
            assertThat(defaults).containsKey("belongingList");
            assertThat(defaults).containsKey("responseOptions");

            @SuppressWarnings("unchecked")
            List<String> belongingList = (List<String>) defaults.get("belongingList");
            assertThat(belongingList).containsExactly("S", "A", "T", "B");

            @SuppressWarnings("unchecked")
            List<ResponseOptionDto> responseOptions = (List<ResponseOptionDto>) defaults.get("responseOptions");
            assertThat(responseOptions).hasSize(3);
            assertThat(responseOptions.get(0).getOption()).isEqualTo("出席");
            assertThat(responseOptions.get(0).getIsAttending()).isTrue();
        }
    }

    @Nested
    @DisplayName("getScheduleIdsWithSurveys - 出欠調査が紐づくスケジュールID取得")
    class GetScheduleIdsWithSurveysTests {

        @Test
        @DisplayName("出欠調査が紐づくスケジュールIDリストを取得")
        void shouldReturnScheduleIdsWithSurveys() {
            // 準備
            List<Long> expectedIds = List.of(1L, 2L, 3L);
            when(surveyDetailRepository.findAllScheduleIdsWithSurveys()).thenReturn(expectedIds);

            // 実行
            List<Long> result = surveyService.getScheduleIdsWithSurveys();

            // 検証
            assertThat(result).isEqualTo(expectedIds);
        }
    }

    @Nested
    @DisplayName("getAllSurveys - 全出欠調査取得")
    class GetAllSurveysTests {

        @Test
        @DisplayName("認証済みユーザーとして全出欠調査を取得")
        void shouldReturnAllSurveysWithResponseStatus() {
            // 準備
            setupSecurityContext();
            List<Survey> surveys = List.of(testSurvey);
            when(surveyRepository.findAllByOrderByCreatedAtDesc()).thenReturn(surveys);
            when(surveyResponseRepository.findRespondedSurveyIdsByUserName("testuser"))
                    .thenReturn(List.of(1L));

            // 実行
            List<SurveyDto> result = surveyService.getAllSurveys();

            // 検証
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getTitle()).isEqualTo("Test Survey");
            assertThat(result.get(0).getHasResponded()).isTrue();
        }
    }

    @Nested
    @DisplayName("getSurveyByUrlId - URLIDで出欠調査取得")
    class GetSurveyByUrlIdTests {

        @Test
        @DisplayName("存在する出欠調査を取得")
        void shouldReturnSurveyWhenExists() {
            // 準備
            testSurvey.getDetails().add(testDetail);
            when(surveyRepository.findByUrlIdWithDetails("surv001"))
                    .thenReturn(Optional.of(testSurvey));

            // 実行
            SurveyDto result = surveyService.getSurveyByUrlId("surv001");

            // 検証
            assertThat(result.getTitle()).isEqualTo("Test Survey");
            assertThat(result.getUrlId()).isEqualTo("surv001");
        }

        @Test
        @DisplayName("存在しない出欠調査の場合、例外をスロー")
        void shouldThrowExceptionWhenNotFound() {
            // 準備
            when(surveyRepository.findByUrlIdWithDetails("invalid"))
                    .thenReturn(Optional.empty());

            // 実行・検証
            assertThatThrownBy(() -> surveyService.getSurveyByUrlId("invalid"))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("アンケートが見つかりません");
        }
    }

    @Nested
    @DisplayName("getSurveyWithResults - 結果付き出欠調査取得")
    class GetSurveyWithResultsTests {

        @Test
        @DisplayName("回答を含む出欠調査を取得")
        void shouldReturnSurveyWithResponses() {
            // 準備
            SurveyResponse response = SurveyResponse.builder()
                    .id(1L)
                    .surveyDetail(testDetail)
                    .userName("responder")
                    .belonging("S")
                    .responseOption("出席")
                    .build();
            testDetail.getResponses().add(response);
            testSurvey.getDetails().add(testDetail);

            when(surveyRepository.findByUrlIdWithDetailsAndResponses("surv001"))
                    .thenReturn(Optional.of(testSurvey));

            // 実行
            SurveyDto result = surveyService.getSurveyWithResults("surv001");

            // 検証
            assertThat(result.getDetails()).hasSize(1);
            assertThat(result.getDetails().get(0).getResponses()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("createSurvey - 出欠調査作成")
    class CreateSurveyTests {

        @Test
        @DisplayName("正常に出欠調査を作成")
        void shouldCreateSurveySuccessfully() {
            // 準備
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));
            when(surveyRepository.save(any(Survey.class))).thenAnswer(invocation -> {
                Survey saved = invocation.getArgument(0);
                saved.setId(1L);
                saved.setUrlId("newurl01");
                return saved;
            });
            when(surveyDetailRepository.save(any(SurveyDetail.class))).thenReturn(testDetail);
            when(surveyRepository.findByUrlIdWithDetails(anyString()))
                    .thenReturn(Optional.of(testSurvey));

            CreateSurveyRequest request = CreateSurveyRequest.builder()
                    .title("New Survey")
                    .description("Description")
                    .belongingList(List.of("S", "A"))
                    .responseOptions(List.of(
                            ResponseOptionDto.builder().option("出席").isAttending(true).build()
                    ))
                    .enableFreetext(true)
                    .details(List.of(
                            CreateSurveyRequest.SurveyDetailRequest.builder()
                                    .scheduleId(1L)
                                    .mandatory(false)
                                    .build()
                    ))
                    .build();

            // 実行
            SurveyDto result = surveyService.createSurvey(request);

            // 検証
            verify(surveyRepository).save(any(Survey.class));
            verify(surveyDetailRepository).save(any(SurveyDetail.class));
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("存在しないスケジュールの場合、例外をスロー")
        void shouldThrowExceptionWhenScheduleNotFound() {
            // 準備
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(surveyRepository.save(any(Survey.class))).thenAnswer(invocation -> {
                Survey saved = invocation.getArgument(0);
                saved.setId(1L);
                return saved;
            });
            when(scheduleRepository.findById(999L)).thenReturn(Optional.empty());

            CreateSurveyRequest request = CreateSurveyRequest.builder()
                    .title("New Survey")
                    .responseOptions(List.of(
                            ResponseOptionDto.builder().option("出席").isAttending(true).build()
                    ))
                    .details(List.of(
                            CreateSurveyRequest.SurveyDetailRequest.builder()
                                    .scheduleId(999L)
                                    .build()
                    ))
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.createSurvey(request))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("スケジュールが見つかりません");
        }
    }

    @Nested
    @DisplayName("deleteSurvey - 出欠調査削除")
    class DeleteSurveyTests {

        @Test
        @DisplayName("正常に出欠調査を削除")
        void shouldDeleteSurveySuccessfully() {
            // 準備
            testSurvey.getDetails().add(testDetail);
            when(surveyRepository.findById(1L)).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of(testDetail));

            // 実行
            surveyService.deleteSurvey(1L);

            // 検証
            verify(scheduleRepository).updateAttendees(testSchedule.getId(), null);
            verify(surveyRepository).deleteById(1L);
        }

        @Test
        @DisplayName("存在しない出欠調査の場合、例外をスロー")
        void shouldThrowExceptionWhenNotFound() {
            // 準備
            when(surveyRepository.findById(999L)).thenReturn(Optional.empty());

            // 実行・検証
            assertThatThrownBy(() -> surveyService.deleteSurvey(999L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("アンケートが見つかりません");
        }
    }

    @Nested
    @DisplayName("submitResponses - 回答提出")
    class SubmitResponsesTests {

        @Test
        @DisplayName("ログインユーザーが正常に回答を提出")
        void shouldSubmitResponsesForAuthenticatedUser() {
            // 準備
            setupSecurityContext();
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findById(1L)).thenReturn(Optional.of(testDetail));
            when(surveyResponseRepository.findBySurveyDetailIdAndUserName(1L, "testuser"))
                    .thenReturn(Optional.empty());
            when(surveyResponseRepository.save(any(SurveyResponse.class)))
                    .thenAnswer(invocation -> {
                        SurveyResponse response = invocation.getArgument(0);
                        response.setId(1L);
                        return response;
                    });
            when(surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(anyLong()))
                    .thenReturn(List.of(testDetail));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .belonging("S")
                    .responses(List.of(
                            SubmitSurveyResponseRequest.ResponseItem.builder()
                                    .surveyDetailId(1L)
                                    .responseOption("出席")
                                    .build()
                    ))
                    .build();

            // 実行
            List<SurveyResponseDto> result = surveyService.submitResponses("surv001", request);

            // 検証
            assertThat(result).hasSize(1);
            verify(surveyResponseRepository).save(any(SurveyResponse.class));
        }

        @Test
        @DisplayName("締め切り後の提出はエラー（softDue=false）")
        void shouldRejectAfterDeadline() {
            // 準備
            setupSecurityContext();
            testSurvey.setDeadlineAt(LocalDateTime.now().minusDays(1));
            testSurvey.setSoftDue(false);
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .belonging("S")
                    .responses(List.of())
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("回答期限を過ぎています");
        }

        @Test
        @DisplayName("締め切り後でもsoftDue=trueなら提出可能")
        void shouldAllowAfterDeadlineWhenSoftDue() {
            // 準備
            setupSecurityContext();
            testSurvey.setDeadlineAt(LocalDateTime.now().minusDays(1));
            testSurvey.setSoftDue(true);
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findById(1L)).thenReturn(Optional.of(testDetail));
            when(surveyResponseRepository.findBySurveyDetailIdAndUserName(1L, "testuser"))
                    .thenReturn(Optional.empty());
            when(surveyResponseRepository.save(any(SurveyResponse.class)))
                    .thenAnswer(invocation -> {
                        SurveyResponse response = invocation.getArgument(0);
                        response.setId(1L);
                        return response;
                    });
            when(surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(anyLong()))
                    .thenReturn(List.of(testDetail));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .belonging("S")
                    .responses(List.of(
                            SubmitSurveyResponseRequest.ResponseItem.builder()
                                    .surveyDetailId(1L)
                                    .responseOption("出席")
                                    .build()
                    ))
                    .build();

            // 実行
            List<SurveyResponseDto> result = surveyService.submitResponses("surv001", request);

            // 検証
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("所属リストがある場合、所属は必須")
        void shouldRequireBelongingWhenListConfigured() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList("S,A,T,B");
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .belonging(null)  // 所属未指定
                    .responses(List.of())
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("所属は必須です");
        }

        @Test
        @DisplayName("非ログイン時、登録済みユーザー名では回答不可")
        void shouldRejectRegisteredUsernameForAnonymous() {
            // 準備
            setupAnonymousContext();
            testSurvey.setBelongingList(null);  // 所属不要
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(userRepository.existsByUsername("existinguser")).thenReturn(true);

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("existinguser")
                    .responses(List.of())
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("ログインして回答してください");
        }

        @Test
        @DisplayName("非ログイン時、既に回答済みのユーザー名では回答不可")
        void shouldRejectDuplicateUsernameForAnonymous() {
            // 準備
            setupAnonymousContext();
            testSurvey.setBelongingList(null);
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(userRepository.existsByUsername("anonymous")).thenReturn(false);
            when(surveyResponseRepository.findByUrlIdAndUserName("surv001", "anonymous"))
                    .thenReturn(List.of(SurveyResponse.builder().id(1L).build()));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("anonymous")
                    .responses(List.of())
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("既に回答済みです");
        }

        @Test
        @DisplayName("ログイン時、自分以外のユーザー名では回答不可")
        void shouldRejectOtherUsernameForAuthenticated() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList(null);
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("otheruser")  // testuser以外
                    .responses(List.of())
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("自分のユーザー名でのみ回答できます");
        }

        @Test
        @DisplayName("詳細が別の出欠調査に属する場合、エラー")
        void shouldRejectDetailFromDifferentSurvey() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList(null);
            Survey otherSurvey = Survey.builder().id(999L).build();
            SurveyDetail otherDetail = SurveyDetail.builder()
                    .id(99L)
                    .survey(otherSurvey)
                    .build();

            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of());
            when(surveyDetailRepository.findById(99L)).thenReturn(Optional.of(otherDetail));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .responses(List.of(
                            SubmitSurveyResponseRequest.ResponseItem.builder()
                                    .surveyDetailId(99L)
                                    .build()
                    ))
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("アンケート項目がこのアンケートに属していません");
        }

        @Test
        @DisplayName("必須項目が未回答の場合、エラー")
        void shouldRejectWhenMandatoryFieldNotAnswered() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList(null);

            // mandatory=trueの詳細を作成
            SurveyDetail mandatoryDetail = SurveyDetail.builder()
                    .id(1L)
                    .survey(testSurvey)
                    .schedule(testSchedule)
                    .mandatory(true)
                    .responses(new HashSet<>())
                    .build();

            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of(mandatoryDetail));

            // responseOptionが空の回答
            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .responses(List.of(
                            SubmitSurveyResponseRequest.ResponseItem.builder()
                                    .surveyDetailId(1L)
                                    .responseOption("")  // 空文字
                                    .build()
                    ))
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("必須項目が未回答です");
        }

        @Test
        @DisplayName("必須項目がnullの場合、エラー")
        void shouldRejectWhenMandatoryFieldIsNull() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList(null);

            SurveyDetail mandatoryDetail = SurveyDetail.builder()
                    .id(1L)
                    .survey(testSurvey)
                    .schedule(testSchedule)
                    .mandatory(true)
                    .responses(new HashSet<>())
                    .build();

            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of(mandatoryDetail));

            // responseOptionがnullの回答
            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .responses(List.of(
                            SubmitSurveyResponseRequest.ResponseItem.builder()
                                    .surveyDetailId(1L)
                                    .responseOption(null)  // null
                                    .build()
                    ))
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("必須項目が未回答です");
        }

        @Test
        @DisplayName("必須項目に対する回答がリクエストに含まれていない場合、エラー")
        void shouldRejectWhenMandatoryFieldMissingFromRequest() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList(null);

            SurveyDetail mandatoryDetail = SurveyDetail.builder()
                    .id(1L)
                    .survey(testSurvey)
                    .schedule(testSchedule)
                    .mandatory(true)
                    .responses(new HashSet<>())
                    .build();

            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of(mandatoryDetail));

            // 必須項目に対する回答を含まないリクエスト
            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .responses(List.of())  // 空のリスト
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.submitResponses("surv001", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("必須項目が未回答です");
        }

        @Test
        @DisplayName("必須項目に回答がある場合、正常に処理される")
        void shouldAcceptWhenMandatoryFieldAnswered() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList(null);

            SurveyDetail mandatoryDetail = SurveyDetail.builder()
                    .id(1L)
                    .survey(testSurvey)
                    .schedule(testSchedule)
                    .mandatory(true)
                    .responses(new HashSet<>())
                    .build();

            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of(mandatoryDetail));
            when(surveyDetailRepository.findById(1L)).thenReturn(Optional.of(mandatoryDetail));
            when(surveyResponseRepository.findBySurveyDetailIdAndUserName(1L, "testuser"))
                    .thenReturn(Optional.empty());
            when(surveyResponseRepository.save(any(SurveyResponse.class)))
                    .thenAnswer(invocation -> {
                        SurveyResponse response = invocation.getArgument(0);
                        response.setId(1L);
                        return response;
                    });
            when(surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(anyLong()))
                    .thenReturn(List.of(mandatoryDetail));

            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .responses(List.of(
                            SubmitSurveyResponseRequest.ResponseItem.builder()
                                    .surveyDetailId(1L)
                                    .responseOption("出席")  // 回答あり
                                    .build()
                    ))
                    .build();

            // 実行
            List<SurveyResponseDto> result = surveyService.submitResponses("surv001", request);

            // 検証
            assertThat(result).hasSize(1);
            verify(surveyResponseRepository).save(any(SurveyResponse.class));
        }

        @Test
        @DisplayName("任意項目（mandatory=false）は未回答でも許可される")
        void shouldAcceptWhenOptionalFieldNotAnswered() {
            // 準備
            setupSecurityContext();
            testSurvey.setBelongingList(null);

            // mandatory=falseの詳細
            SurveyDetail optionalDetail = SurveyDetail.builder()
                    .id(1L)
                    .survey(testSurvey)
                    .schedule(testSchedule)
                    .mandatory(false)
                    .responses(new HashSet<>())
                    .build();

            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of(optionalDetail));
            when(surveyDetailRepository.findById(1L)).thenReturn(Optional.of(optionalDetail));
            when(surveyResponseRepository.findBySurveyDetailIdAndUserName(1L, "testuser"))
                    .thenReturn(Optional.empty());
            when(surveyResponseRepository.save(any(SurveyResponse.class)))
                    .thenAnswer(invocation -> {
                        SurveyResponse response = invocation.getArgument(0);
                        response.setId(1L);
                        return response;
                    });
            when(surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(anyLong()))
                    .thenReturn(List.of(optionalDetail));

            // responseOptionが空の回答
            SubmitSurveyResponseRequest request = SubmitSurveyResponseRequest.builder()
                    .userName("testuser")
                    .responses(List.of(
                            SubmitSurveyResponseRequest.ResponseItem.builder()
                                    .surveyDetailId(1L)
                                    .responseOption("")  // 空でもOK
                                    .build()
                    ))
                    .build();

            // 実行
            List<SurveyResponseDto> result = surveyService.submitResponses("surv001", request);

            // 検証
            assertThat(result).hasSize(1);
            verify(surveyResponseRepository).save(any(SurveyResponse.class));
        }
    }

    @Nested
    @DisplayName("getMyResponses - 自分の回答取得")
    class GetMyResponsesTests {

        @Test
        @DisplayName("自分の回答を取得")
        void shouldReturnMyResponses() {
            // 準備
            setupSecurityContext();
            SurveyResponse response = SurveyResponse.builder()
                    .id(1L)
                    .surveyDetail(testDetail)
                    .userName("testuser")
                    .belonging("S")
                    .responseOption("出席")
                    .build();
            when(surveyResponseRepository.findByUrlIdAndUserName("surv001", "testuser"))
                    .thenReturn(List.of(response));

            // 実行
            List<SurveyResponseDto> result = surveyService.getMyResponses("surv001");

            // 検証
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getUserName()).isEqualTo("testuser");
        }
    }

    @Nested
    @DisplayName("deleteResponse - 回答削除")
    class DeleteResponseTests {

        @Test
        @DisplayName("正常に回答を削除")
        void shouldDeleteResponseSuccessfully() {
            // 準備
            SurveyResponse response = SurveyResponse.builder()
                    .id(1L)
                    .surveyDetail(testDetail)
                    .userName("user")
                    .build();
            when(surveyResponseRepository.findById(1L)).thenReturn(Optional.of(response));
            when(surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(anyLong()))
                    .thenReturn(List.of(testDetail));

            // 実行
            surveyService.deleteResponse(1L);

            // 検証
            verify(surveyResponseRepository).deleteById(1L);
        }

        @Test
        @DisplayName("存在しない回答の場合、例外をスロー")
        void shouldThrowExceptionWhenResponseNotFound() {
            // 準備
            when(surveyResponseRepository.findById(999L)).thenReturn(Optional.empty());

            // 実行・検証
            assertThatThrownBy(() -> surveyService.deleteResponse(999L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("回答が見つかりません");
        }
    }

    @Nested
    @DisplayName("deleteUserResponses - ユーザーの全回答削除")
    class DeleteUserResponsesTests {

        @Test
        @DisplayName("正常にユーザーの全回答を削除")
        void shouldDeleteAllUserResponsesSuccessfully() {
            // 準備
            SurveyResponse response = SurveyResponse.builder()
                    .id(1L)
                    .surveyDetail(testDetail)
                    .userName("targetuser")
                    .build();
            when(surveyRepository.findByUrlId("surv001")).thenReturn(Optional.of(testSurvey));
            when(surveyResponseRepository.findByUrlIdAndUserName("surv001", "targetuser"))
                    .thenReturn(List.of(response));
            when(surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(anyLong()))
                    .thenReturn(List.of(testDetail));

            // 実行
            surveyService.deleteUserResponses("surv001", "targetuser");

            // 検証
            verify(surveyResponseRepository).deleteAll(List.of(response));
        }

        @Test
        @DisplayName("存在しない出欠調査の場合、例外をスロー")
        void shouldThrowExceptionWhenSurveyNotFound() {
            // 準備
            when(surveyRepository.findByUrlId("invalid")).thenReturn(Optional.empty());

            // 実行・検証
            assertThatThrownBy(() -> surveyService.deleteUserResponses("invalid", "user"))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("アンケートが見つかりません");
        }
    }

    @Nested
    @DisplayName("updateSurvey - 出欠調査更新")
    class UpdateSurveyTests {

        @Test
        @DisplayName("正常に出欠調査を更新")
        void shouldUpdateSurveySuccessfully() {
            // 準備
            when(surveyRepository.findById(1L)).thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyId(1L)).thenReturn(List.of(testDetail));
            when(scheduleRepository.findById(2L)).thenReturn(Optional.of(
                    Schedule.builder().id(2L).urlId("sched002").summary("New Schedule").build()
            ));
            when(surveyDetailRepository.save(any(SurveyDetail.class))).thenReturn(testDetail);
            when(surveyRepository.save(any(Survey.class))).thenReturn(testSurvey);
            when(surveyRepository.findByUrlIdWithDetails(anyString()))
                    .thenReturn(Optional.of(testSurvey));
            when(surveyDetailRepository.findBySurveyIdWithScheduleAndResponses(anyLong()))
                    .thenReturn(List.of());

            CreateSurveyRequest request = CreateSurveyRequest.builder()
                    .title("Updated Title")
                    .description("Updated Description")
                    .responseOptions(List.of(
                            ResponseOptionDto.builder().option("出席").isAttending(true).build()
                    ))
                    .details(List.of(
                            CreateSurveyRequest.SurveyDetailRequest.builder()
                                    .scheduleId(2L)  // 新しいスケジュール
                                    .build()
                    ))
                    .build();

            // 実行
            SurveyDto result = surveyService.updateSurvey(1L, request);

            // 検証
            verify(surveyDetailRepository).deleteBySurveyId(1L);
            verify(scheduleRepository).updateAttendees(1L, null);  // 古いスケジュールのattendeesをクリア
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("存在しない出欠調査の場合、例外をスロー")
        void shouldThrowExceptionWhenSurveyNotFound() {
            // 準備
            when(surveyRepository.findById(999L)).thenReturn(Optional.empty());

            CreateSurveyRequest request = CreateSurveyRequest.builder()
                    .title("Title")
                    .responseOptions(List.of())
                    .details(List.of())
                    .build();

            // 実行・検証
            assertThatThrownBy(() -> surveyService.updateSurvey(999L, request))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("アンケートが見つかりません");
        }
    }
}

package io.github.tknknk.yucale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.SurveyDetail;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurveyDetailRepository extends JpaRepository<SurveyDetail, Long> {

    List<SurveyDetail> findBySurveyId(Long surveyId);

    List<SurveyDetail> findByScheduleId(Long scheduleId);

    Optional<SurveyDetail> findBySurveyIdAndScheduleId(Long surveyId, Long scheduleId);

    @Query("SELECT sd FROM SurveyDetail sd LEFT JOIN FETCH sd.schedule LEFT JOIN FETCH sd.responses WHERE sd.survey.id = :surveyId")
    List<SurveyDetail> findBySurveyIdWithScheduleAndResponses(@Param("surveyId") Long surveyId);

    void deleteBySurveyId(Long surveyId);

    @Query("SELECT DISTINCT sd.schedule.id FROM SurveyDetail sd")
    List<Long> findAllScheduleIdsWithSurveys();
}

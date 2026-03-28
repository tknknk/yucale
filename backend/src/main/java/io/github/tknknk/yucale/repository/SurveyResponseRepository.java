package io.github.tknknk.yucale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.SurveyResponse;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, Long> {

    List<SurveyResponse> findBySurveyDetailId(Long surveyDetailId);

    Optional<SurveyResponse> findBySurveyDetailIdAndUserName(Long surveyDetailId, String userName);

    boolean existsBySurveyDetailIdAndUserName(Long surveyDetailId, String userName);

    @Query("SELECT sr FROM SurveyResponse sr WHERE sr.surveyDetail.survey.id = :surveyId AND sr.userName = :userName")
    List<SurveyResponse> findBySurveyIdAndUserName(@Param("surveyId") Long surveyId, @Param("userName") String userName);

    @Query("SELECT sr FROM SurveyResponse sr WHERE sr.surveyDetail.survey.urlId = :urlId AND sr.userName = :userName")
    List<SurveyResponse> findByUrlIdAndUserName(@Param("urlId") String urlId, @Param("userName") String userName);

    void deleteBySurveyDetailId(Long surveyDetailId);

    @Modifying
    @Query("DELETE FROM SurveyResponse sr WHERE sr.surveyDetail.survey.urlId = :urlId AND sr.userName = :userName")
    void deleteByUrlIdAndUserName(@Param("urlId") String urlId, @Param("userName") String userName);

    @Modifying
    @Query("UPDATE SurveyResponse sr SET sr.userName = :newUserName WHERE sr.userName = :oldUserName")
    int updateUserName(@Param("oldUserName") String oldUserName, @Param("newUserName") String newUserName);

    @Query("SELECT DISTINCT sr.surveyDetail.survey.id FROM SurveyResponse sr WHERE sr.userName = :userName")
    List<Long> findRespondedSurveyIdsByUserName(@Param("userName") String userName);
}

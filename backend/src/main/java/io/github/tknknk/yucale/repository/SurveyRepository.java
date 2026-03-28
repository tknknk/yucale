package io.github.tknknk.yucale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.Survey;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurveyRepository extends JpaRepository<Survey, Long> {

    Optional<Survey> findByUrlId(String urlId);

    List<Survey> findAllByOrderByCreatedAtDesc();

    @Query("SELECT s FROM Survey s LEFT JOIN FETCH s.details d LEFT JOIN FETCH d.schedule WHERE s.urlId = :urlId")
    Optional<Survey> findByUrlIdWithDetails(@Param("urlId") String urlId);

    @Query("SELECT s FROM Survey s LEFT JOIN FETCH s.details d LEFT JOIN FETCH d.schedule LEFT JOIN FETCH d.responses WHERE s.urlId = :urlId")
    Optional<Survey> findByUrlIdWithDetailsAndResponses(@Param("urlId") String urlId);

    boolean existsByUrlId(String urlId);
}

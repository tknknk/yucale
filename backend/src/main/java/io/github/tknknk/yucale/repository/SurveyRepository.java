package io.github.tknknk.yucale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.Survey;
import io.github.tknknk.yucale.entity.User;

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

    /**
     * Reassign the author of every survey created by the given user.
     * Used when a user is deleted so their surveys (and the responses to them)
     * are not removed by the ON DELETE CASCADE on surveys.created_by.
     *
     * @return number of reassigned surveys
     */
    @Modifying
    @Query("UPDATE Survey s SET s.createdBy = :newOwner WHERE s.createdBy.id = :previousOwnerId")
    int reassignCreatedBy(@Param("previousOwnerId") Long previousOwnerId, @Param("newOwner") User newOwner);
}

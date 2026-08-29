package io.github.tknknk.yucale.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.Notice;
import io.github.tknknk.yucale.entity.User;

import java.util.List;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    /**
     * Get the latest 3 notices for the top page
     */
    List<Notice> findTop3ByOrderByCreatedAtDesc();

    /**
     * Get all notices with pagination, ordered by createdAt descending
     */
    Page<Notice> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Reassign the author of every notice created by the given user.
     * Used when a user is deleted so their notices are not orphaned.
     *
     * @return number of reassigned notices
     */
    @Modifying
    @Query("UPDATE Notice n SET n.createdBy = :newOwner WHERE n.createdBy.id = :previousOwnerId")
    int reassignCreatedBy(@Param("previousOwnerId") Long previousOwnerId, @Param("newOwner") User newOwner);
}

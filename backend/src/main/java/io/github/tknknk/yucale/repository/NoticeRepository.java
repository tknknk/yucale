package io.github.tknknk.yucale.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.Notice;

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
}

package io.github.tknknk.yucale.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.Schedule;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    Optional<Schedule> findByUrlId(String urlId);

    /**
     * Update only the attendees field without changing updated_at
     */
    @Modifying
    @Query("UPDATE Schedule s SET s.attendees = :attendees WHERE s.id = :id")
    void updateAttendees(@Param("id") Long id, @Param("attendees") String attendees);

    List<Schedule> findByDtstartBetween(LocalDateTime start, LocalDateTime end);

    List<Schedule> findByDtstartGreaterThanEqual(LocalDateTime start);

    List<Schedule> findByDtendLessThanEqual(LocalDateTime end);

    @Query("SELECT s FROM Schedule s WHERE s.dtstart <= :end AND s.dtend >= :start")
    List<Schedule> findSchedulesInRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<Schedule> findByAllDayTrue();

    List<Schedule> findBySummaryContainingIgnoreCase(String summary);

    /**
     * Get distinct locations ordered by most recent schedule ID (descending)
     */
    @Query("SELECT s.location FROM Schedule s WHERE s.location IS NOT NULL AND s.location <> '' GROUP BY s.location ORDER BY MAX(s.id) DESC")
    List<String> findDistinctLocationsOrderByLatestId();

    // Count past schedules (finished: dtend < now, for all-day events: dtend < todayStart)
    @Query("SELECT COUNT(s) FROM Schedule s WHERE " +
           "(s.allDay = false AND s.dtend < :now) OR " +
           "(s.allDay = true AND s.dtend < :todayStart)")
    long countPastSchedules(@Param("now") LocalDateTime now, @Param("todayStart") LocalDateTime todayStart);

    // Count future/ongoing schedules (not finished yet)
    @Query("SELECT COUNT(s) FROM Schedule s WHERE " +
           "(s.allDay = false AND s.dtend >= :now) OR " +
           "(s.allDay = true AND s.dtend >= :todayStart)")
    long countFutureSchedules(@Param("now") LocalDateTime now, @Param("todayStart") LocalDateTime todayStart);

    // Get past schedules with pagination, ordered by dtstart DESC (most recent first)
    @Query("SELECT s FROM Schedule s WHERE " +
           "(s.allDay = false AND s.dtend < :now) OR " +
           "(s.allDay = true AND s.dtend < :todayStart) " +
           "ORDER BY s.dtstart DESC")
    List<Schedule> findPastSchedules(@Param("now") LocalDateTime now, @Param("todayStart") LocalDateTime todayStart, Pageable pageable);

    // Get future/ongoing schedules with pagination, ordered by dtstart ASC
    @Query("SELECT s FROM Schedule s WHERE " +
           "(s.allDay = false AND s.dtend >= :now) OR " +
           "(s.allDay = true AND s.dtend >= :todayStart) " +
           "ORDER BY s.dtstart ASC")
    List<Schedule> findFutureSchedules(@Param("now") LocalDateTime now, @Param("todayStart") LocalDateTime todayStart, Pageable pageable);
}

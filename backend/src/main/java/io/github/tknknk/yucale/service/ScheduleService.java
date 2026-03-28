package io.github.tknknk.yucale.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.tknknk.yucale.dto.ScheduleDto;
import io.github.tknknk.yucale.entity.Schedule;
import io.github.tknknk.yucale.repository.ScheduleRepository;
import io.github.tknknk.yucale.security.CustomUserDetails;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;

    /**
     * Get all schedules with pagination (public access)
     */
    public Page<ScheduleDto> getAllSchedules(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "dtstart"));
        return scheduleRepository.findAll(pageable).map(this::toDto);
    }

    /**
     * Get a single schedule by ID (public access)
     */
    public ScheduleDto getScheduleById(Long id) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("スケジュールが見つかりません"));
        return toDto(schedule);
    }

    /**
     * Get a single schedule by URL ID (public access)
     */
    public ScheduleDto getScheduleByUrlId(String urlId) {
        Schedule schedule = scheduleRepository.findByUrlId(urlId)
                .orElseThrow(() -> new EntityNotFoundException("スケジュールが見つかりません"));
        return toDto(schedule);
    }

    /**
     * Create a new schedule (requires EDITOR or ADMIN role)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ScheduleDto createSchedule(ScheduleDto dto) {
        validateScheduleDates(dto);

        Schedule schedule = Schedule.builder()
                .summary(dto.getSummary())
                .dtstart(dto.getDtstart())
                .dtend(dto.getDtend())
                .allDay(dto.getAllDay() != null ? dto.getAllDay() : false)
                .location(dto.getLocation())
                .description(dto.getDescription())
                .song(dto.getSong())
                .recording(dto.getRecording())
                .dtstamp(LocalDateTime.now())
                .updatedBy(getCurrentUsername())
                .build();

        Schedule saved = scheduleRepository.save(schedule);
        log.info("Schedule created | id={} | title={}", saved.getId(), saved.getSummary());
        return toDto(saved);
    }

    /**
     * Update an existing schedule (requires EDITOR or ADMIN role)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ScheduleDto updateSchedule(Long id, ScheduleDto dto) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("スケジュールが見つかりません"));

        validateScheduleDates(dto);

        schedule.setSummary(dto.getSummary());
        schedule.setDtstart(dto.getDtstart());
        schedule.setDtend(dto.getDtend());
        schedule.setAllDay(dto.getAllDay() != null ? dto.getAllDay() : false);
        schedule.setLocation(dto.getLocation());
        schedule.setDescription(dto.getDescription());
        schedule.setSong(dto.getSong());
        schedule.setRecording(dto.getRecording());
        schedule.setDtstamp(LocalDateTime.now());
        schedule.setUpdatedBy(getCurrentUsername());

        Schedule updated = scheduleRepository.save(schedule);
        log.info("Schedule updated | id={}", id);
        return toDto(updated);
    }

    /**
     * Delete a schedule (requires EDITOR or ADMIN role)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public void deleteSchedule(Long id) {
        if (!scheduleRepository.existsById(id)) {
            throw new EntityNotFoundException("スケジュールが見つかりません");
        }
        scheduleRepository.deleteById(id);
        log.info("Schedule deleted | id={}", id);
    }

    /**
     * Get upcoming schedules (public access)
     */
    public List<ScheduleDto> getUpcomingSchedules(int limit) {
        LocalDateTime now = LocalDateTime.now();
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.ASC, "dtstart"));
        return scheduleRepository.findByDtstartGreaterThanEqual(now).stream()
                .sorted((s1, s2) -> s1.getDtstart().compareTo(s2.getDtstart()))
                .limit(limit)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get schedules between two dates (public access)
     */
    public List<ScheduleDto> getSchedulesBetween(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new IllegalArgumentException("開始日と終了日は必須です");
        }
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("開始日は終了日より前に設定してください");
        }
        return scheduleRepository.findSchedulesInRange(start, end).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all schedules (for ICS generation)
     */
    public List<Schedule> getAllSchedulesForIcs() {
        return scheduleRepository.findAll(Sort.by(Sort.Direction.ASC, "dtstart"));
    }

    /**
     * Get schedules split by past and future with optional past limit
     * @param loadAllPast if true, load all past schedules; if false, apply 6n rule
     * @param futureSize number of future schedules to load per page
     * @return Map containing past schedules, future schedules, counts, and metadata
     */
    public java.util.Map<String, Object> getSchedulesSplit(boolean loadAllPast, int futureSize) {
        LocalDateTime now = LocalDateTime.now();
        // For all-day events, use start of today for comparison
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();

        // Count past and future schedules
        long totalPast = scheduleRepository.countPastSchedules(now, todayStart);
        long totalFuture = scheduleRepository.countFutureSchedules(now, todayStart);

        // Calculate how many past schedules to hide using 6n rule
        // If pastCount is (6n)~(6n+5), hide 6n past schedules
        long hiddenPastCount = loadAllPast ? 0 : (totalPast / 6) * 6;
        long visiblePastCount = totalPast - hiddenPastCount;

        // Get past schedules (limited or all)
        List<ScheduleDto> pastSchedules;
        if (loadAllPast || visiblePastCount > 0) {
            int limit = loadAllPast ? (int) totalPast : (int) visiblePastCount;
            if (limit > 0) {
                Pageable pageable = PageRequest.of(0, limit);
                pastSchedules = scheduleRepository.findPastSchedules(now, todayStart, pageable).stream()
                        .sorted((s1, s2) -> s1.getDtstart().compareTo(s2.getDtstart())) // Re-sort ASC
                        .map(this::toDto)
                        .collect(Collectors.toList());
            } else {
                pastSchedules = List.of();
            }
        } else {
            pastSchedules = List.of();
        }

        // Get all future/ongoing schedules
        Pageable futurePageable = PageRequest.of(0, futureSize);
        List<ScheduleDto> futureSchedules = scheduleRepository.findFutureSchedules(now, todayStart, futurePageable).stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("pastSchedules", pastSchedules);
        result.put("futureSchedules", futureSchedules);
        result.put("totalPast", totalPast);
        result.put("totalFuture", totalFuture);
        result.put("hiddenPastCount", hiddenPastCount);
        result.put("hasMorePast", hiddenPastCount > 0);
        result.put("hasMoreFuture", totalFuture > futureSize);

        return result;
    }

    /**
     * Get distinct locations ordered by most recent usage
     */
    public List<String> getDistinctLocations() {
        return scheduleRepository.findDistinctLocationsOrderByLatestId();
    }

    /**
     * Validate schedule dates
     */
    private void validateScheduleDates(ScheduleDto dto) {
        if (dto.getDtstart() == null || dto.getDtend() == null) {
            throw new IllegalArgumentException("開始日と終了日は必須です");
        }
        if (dto.getDtstart().isAfter(dto.getDtend())) {
            throw new IllegalArgumentException("開始日は終了日より前に設定してください");
        }
    }

    /**
     * Get current authenticated user's username
     */
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUsername();
        }
        return null;
    }

    /**
     * Convert entity to DTO
     */
    private ScheduleDto toDto(Schedule schedule) {
        return ScheduleDto.builder()
                .id(schedule.getId())
                .urlId(schedule.getUrlId())
                .summary(schedule.getSummary())
                .dtstart(schedule.getDtstart())
                .dtend(schedule.getDtend())
                .allDay(schedule.getAllDay())
                .location(schedule.getLocation())
                .description(schedule.getDescription())
                .song(schedule.getSong())
                .recording(schedule.getRecording())
                .attendees(schedule.getAttendees())
                .dtstamp(schedule.getDtstamp())
                .createdAt(schedule.getCreatedAt())
                .updatedAt(schedule.getUpdatedAt())
                .updatedBy(schedule.getUpdatedBy())
                .build();
    }
}

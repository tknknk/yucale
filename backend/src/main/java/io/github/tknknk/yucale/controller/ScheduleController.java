package io.github.tknknk.yucale.controller;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import io.github.tknknk.yucale.dto.ApiResponse;
import io.github.tknknk.yucale.dto.ScheduleDto;
import io.github.tknknk.yucale.service.ScheduleService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@Slf4j
public class ScheduleController {

    private final ScheduleService scheduleService;

    /**
     * GET /api/schedules - Get all schedules with pagination (public)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllSchedules(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<ScheduleDto> schedulePage = scheduleService.getAllSchedules(page, size);

        Map<String, Object> response = new HashMap<>();
        response.put("content", schedulePage.getContent());
        response.put("currentPage", schedulePage.getNumber());
        response.put("totalItems", schedulePage.getTotalElements());
        response.put("totalPages", schedulePage.getTotalPages());
        response.put("size", schedulePage.getSize());
        response.put("hasNext", schedulePage.hasNext());
        response.put("hasPrevious", schedulePage.hasPrevious());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/schedules/{id} - Get a single schedule by ID (public)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ScheduleDto>> getScheduleById(@PathVariable Long id) {
        try {
            ScheduleDto schedule = scheduleService.getScheduleById(id);
            return ResponseEntity.ok(ApiResponse.success(schedule));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/schedules/url/{urlId} - Get a single schedule by URL ID (public)
     */
    @GetMapping("/url/{urlId}")
    public ResponseEntity<ApiResponse<ScheduleDto>> getScheduleByUrlId(@PathVariable String urlId) {
        try {
            ScheduleDto schedule = scheduleService.getScheduleByUrlId(urlId);
            return ResponseEntity.ok(ApiResponse.success(schedule));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * POST /api/schedules - Create a new schedule (EDITOR, ADMIN)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<ScheduleDto>> createSchedule(@Valid @RequestBody ScheduleDto dto) {
        try {
            ScheduleDto created = scheduleService.createSchedule(dto);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("スケジュールを作成しました", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/schedules/{id} - Update an existing schedule (EDITOR, ADMIN)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<ScheduleDto>> updateSchedule(
            @PathVariable Long id,
            @Valid @RequestBody ScheduleDto dto) {
        try {
            ScheduleDto updated = scheduleService.updateSchedule(id, dto);
            return ResponseEntity.ok(ApiResponse.success("スケジュールを更新しました", updated));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * DELETE /api/schedules/{id} - Delete a schedule (EDITOR, ADMIN)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable Long id) {
        try {
            scheduleService.deleteSchedule(id);
            return ResponseEntity.ok(ApiResponse.success("スケジュールを削除しました", null));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/schedules/upcoming - Get upcoming schedules (public)
     */
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getUpcomingSchedules(
            @RequestParam(defaultValue = "10") int limit) {

        if (limit < 1 || limit > 100) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("limitは1から100の間で指定してください"));
        }

        List<ScheduleDto> schedules = scheduleService.getUpcomingSchedules(limit);
        return ResponseEntity.ok(ApiResponse.success(schedules));
    }

    /**
     * GET /api/schedules/range - Get schedules in a date range (public)
     */
    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getSchedulesBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        try {
            List<ScheduleDto> schedules = scheduleService.getSchedulesBetween(start, end);
            return ResponseEntity.ok(ApiResponse.success(schedules));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/schedules/locations - Get distinct locations ordered by most recent usage (public)
     */
    @GetMapping("/locations")
    public ResponseEntity<ApiResponse<List<String>>> getLocations() {
        List<String> locations = scheduleService.getDistinctLocations();
        return ResponseEntity.ok(ApiResponse.success(locations));
    }

    /**
     * GET /api/schedules/split - Get schedules split by past/future with optional past limit (public)
     * Uses 6n rule: if there are (6n)~(6n+5) past schedules, initially hide 6n of them
     */
    @GetMapping("/split")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSchedulesSplit(
            @RequestParam(defaultValue = "false") boolean loadAllPast,
            @RequestParam(defaultValue = "100") int futureSize) {

        if (futureSize < 1 || futureSize > 1000) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("futureSizeは1から1000の間で指定してください"));
        }

        Map<String, Object> result = scheduleService.getSchedulesSplit(loadAllPast, futureSize);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}

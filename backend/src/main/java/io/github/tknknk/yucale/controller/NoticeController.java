package io.github.tknknk.yucale.controller;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import io.github.tknknk.yucale.dto.ApiResponse;
import io.github.tknknk.yucale.dto.NoticeDto;
import io.github.tknknk.yucale.service.NoticeService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
@Slf4j
public class NoticeController {

    private final NoticeService noticeService;

    /**
     * GET /api/notices/latest - Get the latest 3 notices (public)
     */
    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<List<NoticeDto>>> getLatestNotices() {
        List<NoticeDto> notices = noticeService.getLatestNotices();
        return ResponseEntity.ok(ApiResponse.success(notices));
    }

    /**
     * GET /api/notices - Get all notices with pagination (public)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllNotices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<NoticeDto> noticePage = noticeService.getAllNotices(page, size);

        Map<String, Object> response = new HashMap<>();
        response.put("content", noticePage.getContent());
        response.put("currentPage", noticePage.getNumber());
        response.put("totalItems", noticePage.getTotalElements());
        response.put("totalPages", noticePage.getTotalPages());
        response.put("size", noticePage.getSize());
        response.put("hasNext", noticePage.hasNext());
        response.put("hasPrevious", noticePage.hasPrevious());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/notices/{id} - Get a single notice by ID (public)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NoticeDto>> getNoticeById(@PathVariable Long id) {
        try {
            NoticeDto notice = noticeService.getNoticeById(id);
            return ResponseEntity.ok(ApiResponse.success(notice));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * POST /api/notices - Create a new notice (EDITOR, ADMIN)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<NoticeDto>> createNotice(@Valid @RequestBody NoticeDto dto) {
        try {
            NoticeDto created = noticeService.createNotice(dto);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("お知らせを作成しました", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/notices/{id} - Update an existing notice (EDITOR, ADMIN)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<NoticeDto>> updateNotice(
            @PathVariable Long id,
            @Valid @RequestBody NoticeDto dto) {
        try {
            NoticeDto updated = noticeService.updateNotice(id, dto);
            return ResponseEntity.ok(ApiResponse.success("お知らせを更新しました", updated));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * DELETE /api/notices/{id} - Delete a notice (EDITOR, ADMIN)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteNotice(@PathVariable Long id) {
        try {
            noticeService.deleteNotice(id);
            return ResponseEntity.ok(ApiResponse.success("お知らせを削除しました", null));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}

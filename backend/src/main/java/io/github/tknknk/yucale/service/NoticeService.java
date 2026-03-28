package io.github.tknknk.yucale.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.tknknk.yucale.dto.NoticeDto;
import io.github.tknknk.yucale.entity.Notice;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.repository.NoticeRepository;
import io.github.tknknk.yucale.repository.UserRepository;
import io.github.tknknk.yucale.security.CustomUserDetails;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;

    /**
     * Get the latest 3 notices for the top page
     */
    public List<NoticeDto> getLatestNotices() {
        return noticeRepository.findTop3ByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all notices with pagination
     */
    public Page<NoticeDto> getAllNotices(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return noticeRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    /**
     * Get a single notice by ID
     */
    public NoticeDto getNoticeById(Long id) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("お知らせが見つかりません"));
        return toDto(notice);
    }

    /**
     * Create a new notice (requires EDITOR or ADMIN role)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public NoticeDto createNotice(NoticeDto dto) {
        User currentUser = getCurrentUser();

        Notice notice = Notice.builder()
                .title(dto.getTitle())
                .content(dto.getContent())
                .createdBy(currentUser)
                .build();

        Notice saved = noticeRepository.save(notice);
        log.info("Notice created | id={} | title={}", saved.getId(), saved.getTitle());
        return toDto(saved);
    }

    /**
     * Update an existing notice (requires EDITOR or ADMIN role)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public NoticeDto updateNotice(Long id, NoticeDto dto) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("お知らせが見つかりません"));

        notice.setTitle(dto.getTitle());
        notice.setContent(dto.getContent());

        Notice updated = noticeRepository.save(notice);
        log.info("Notice updated | id={}", id);
        return toDto(updated);
    }

    /**
     * Delete a notice (requires EDITOR or ADMIN role)
     */
    @Transactional
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    public void deleteNotice(Long id) {
        if (!noticeRepository.existsById(id)) {
            throw new EntityNotFoundException("お知らせが見つかりません");
        }
        noticeRepository.deleteById(id);
        log.info("Notice deleted | id={}", id);
    }

    /**
     * Get current authenticated user
     */
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
            return userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new EntityNotFoundException("ユーザーが見つかりません"));
        }
        throw new IllegalStateException("認証されたユーザーが見つかりません");
    }

    /**
     * Convert entity to DTO
     */
    private NoticeDto toDto(Notice notice) {
        return NoticeDto.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .content(notice.getContent())
                .createdByUserId(notice.getCreatedBy().getId())
                .createdByUsername(notice.getCreatedBy().getUsername())
                .createdAt(notice.getCreatedAt())
                .updatedAt(notice.getUpdatedAt())
                .build();
    }
}

package io.github.tknknk.yucale.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "schedules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "url_id", unique = true, nullable = false, length = 36)
    private String urlId;

    @NotBlank(message = "Summary is required")
    @Size(max = 255, message = "Summary must not exceed 255 characters")
    @Column(nullable = false)
    private String summary;

    @NotNull(message = "Start date/time is required")
    @Column(nullable = false)
    private LocalDateTime dtstart;

    @NotNull(message = "End date/time is required")
    @Column(nullable = false)
    private LocalDateTime dtend;

    @Column(name = "all_day", nullable = false)
    @Builder.Default
    private Boolean allDay = false;

    @Size(max = 255, message = "Location must not exceed 255 characters")
    @Column(length = 255)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String song;

    @Column(columnDefinition = "TEXT")
    private String recording;

    @Column(columnDefinition = "TEXT")
    private String attendees;

    @Column(nullable = false)
    private LocalDateTime dtstamp;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Size(max = 100, message = "Updated by must not exceed 100 characters")
    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @PrePersist
    protected void onCreate() {
        if (urlId == null) {
            urlId = UUID.randomUUID().toString().substring(0, 8);
        }
        if (dtstamp == null) {
            dtstamp = LocalDateTime.now();
        }
    }
}

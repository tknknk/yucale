package io.github.tknknk.yucale.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "survey_responses", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"survey_detail_id", "user_name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"surveyDetail"})
@ToString(exclude = {"surveyDetail"})
public class SurveyResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_detail_id", nullable = false)
    private SurveyDetail surveyDetail;

    @NotBlank(message = "User name is required")
    @Size(max = 100, message = "User name must not exceed 100 characters")
    @Column(name = "user_name", nullable = false, length = 100)
    private String userName;

    @Size(max = 50, message = "Belonging must not exceed 50 characters")
    @Column(length = 50)
    private String belonging;

    @Size(max = 50, message = "Response option must not exceed 50 characters")
    @Column(name = "response_option", length = 50)
    private String responseOption;

    @Column(name = "free_text", columnDefinition = "TEXT")
    private String freeText;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

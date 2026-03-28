package io.github.tknknk.yucale.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "survey_details", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"survey_id", "schedule_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"survey", "schedule", "responses"})
@ToString(exclude = {"survey", "schedule", "responses"})
public class SurveyDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_id", nullable = false)
    private Survey survey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(nullable = false)
    @Builder.Default
    private Boolean mandatory = false;

    @OneToMany(mappedBy = "surveyDetail", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<SurveyResponse> responses = new HashSet<>();
}

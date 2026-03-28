package io.github.tknknk.yucale.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSurveyRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String description;

    private List<String> belongingList;

    @NotEmpty(message = "At least one response option is required")
    private List<ResponseOptionDto> responseOptions;

    private Boolean enableFreetext;

    private LocalDateTime deadlineAt;

    private Boolean softDue;

    @NotEmpty(message = "At least one schedule is required")
    private List<SurveyDetailRequest> details;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SurveyDetailRequest {
        private Long scheduleId;
        private Boolean mandatory;
    }
}

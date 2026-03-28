package io.github.tknknk.yucale.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitSurveyResponseRequest {

    @NotBlank(message = "User name is required")
    @Size(max = 100, message = "User name must not exceed 100 characters")
    private String userName;

    @Size(max = 50, message = "Belonging must not exceed 50 characters")
    private String belonging;

    @NotEmpty(message = "At least one response is required")
    private List<ResponseItem> responses;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResponseItem {
        private Long surveyDetailId;

        @Size(max = 50, message = "Response option must not exceed 50 characters")
        private String responseOption;

        private String freeText;
    }
}

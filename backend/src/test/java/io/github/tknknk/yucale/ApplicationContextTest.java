package io.github.tknknk.yucale;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import io.github.tknknk.yucale.config.RateLimitFilter;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * アプリケーションコンテキストの起動テスト
 *
 * <p>The rest of the suite builds its collaborators with {@code new} and mocks,
 * which says nothing about whether Spring can actually wire them. That gap let a
 * real defect through: adding a second, test-only constructor to
 * {@link RateLimitFilter} made the injection point ambiguous, so Spring looked
 * for a no-arg constructor and the container failed to start — while all 462
 * unit tests stayed green.
 *
 * <p>This starts the real context against the H2 test datasource. It asserts
 * almost nothing on purpose: the value is in the startup itself, which fails on
 * any bean that cannot be constructed, injected or configured.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("アプリケーションコンテキスト")
class ApplicationContextTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private RateLimitFilter rateLimitFilter;

    @Test
    @DisplayName("コンテキストが起動し、全Beanが生成される")
    void contextLoads() {
        assertThat(context).isNotNull();
    }

    @Test
    @DisplayName("RateLimitFilterがコンストラクタインジェクションで生成される")
    void rateLimitFilter_isConstructedBySpring() {
        // Pinned explicitly because this bean has two constructors: the wiring is
        // only unambiguous while the injectable one carries @Autowired.
        assertThat(rateLimitFilter).isNotNull();
    }
}
